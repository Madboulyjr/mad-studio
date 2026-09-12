import {bindViewportGaze} from './avatar-pointer.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAvatarEyes, EYE_APERTURE_GLSL } from './avatar-eyes.js';
import { createAvatarPencil, BUBBLE_PENCIL_HEAD_CUTOUT_GLSL, BUBBLE_PENCIL_HEAD_CUTOUT_FRAGMENT } from './avatar-pencil.js';

const YAW_LIMIT = THREE.MathUtils.degToRad(1.5);
const PITCH_LIMIT = THREE.MathUtils.degToRad(1);
const SETTLE_EPSILON = 0.0001;
const GAZE_SETTLE_EPSILON = 0.001;

function modelResources(object) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  let nodes = 0;
  let meshes = 0;
  let triangles = 0;
  const meshNames = [];

  object?.traverse((node) => {
    nodes += 1;
    if (node.geometry) geometries.add(node.geometry);
    if (node.isMesh) {
      meshes += 1;
      meshNames.push(node.name || '(unnamed mesh)');
      const count = node.geometry.index?.count || node.geometry.attributes.position?.count || 0;
      triangles += (count / 3) * (node.isInstancedMesh ? node.count : 1);
    }
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of nodeMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      for (const uniform of Object.values(material.uniforms || {})) {
        if (uniform.value?.isTexture) textures.add(uniform.value);
      }
    }
  });
  return { geometries, materials, textures, nodes, meshes, triangles, meshNames };
}

function disposeModel(object) {
  const { geometries, materials, textures } = modelResources(object);
  const images = new Set();
  for (const texture of textures) {
    const data = texture.source?.data;
    for (const image of Array.isArray(data) ? data : [data]) {
      if (image && typeof image.close === 'function') images.add(image);
    }
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const image of images) image.close();
  object?.removeFromParent();
}

function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0.035, 0.035, 0.04);
  // Broad reflectors give the material's own roughness map a soft highlight.
  // They illuminate the model through the environment, never the canvas backdrop.
  for (const [width, height, strength, color, position] of [
    [4, 5, 4.0, 0xfff5ed, [-3.5, 2.5, 4]],
    [3, 4, 0.75, 0xf0f4ff, [4, 0.5, 2]],
    [4, 3, 1.3, 0xffffff, [0, 5, 0]],
    [2, 4, 2.0, 0xffffff, [3, 1, -4]],
  ]) {
    const softbox = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength) }),
    );
    softbox.position.set(...position);
    softbox.lookAt(0, 0, 0);
    studio.add(softbox);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(studio, 0.025, 0.1, 100);
  } finally {
    generator.dispose();
    disposeModel(studio);
    studio.clear();
  }
}

const REFERENCE_CAMERA_Z = 6;
const REFERENCE_NEAR = 0.01;
const REFERENCE_FAR = 10;

function captureReferenceDepth(renderer, scene, texture, { framing, center, aspect }) {
  const imageWidth = texture.source.data.naturalWidth || texture.source.data.width || 1600;
  const imageHeight = texture.source.data.naturalHeight || texture.source.data.height || 1600;
  const resolutionScale = Math.min(1, 1600 / Math.max(imageWidth, imageHeight));
  const width = Math.max(1, Math.round(imageWidth * resolutionScale));
  const height = Math.max(1, Math.round(imageHeight * resolutionScale));
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthTexture: new THREE.DepthTexture(width, height, THREE.UnsignedIntType),
    depthBuffer: true,
    stencilBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  const halfWidth = framing * aspect;
  const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, framing, -framing, REFERENCE_NEAR, REFERENCE_FAR);
  const cameraX = -2 * halfWidth * (center[0] - 0.5);
  const cameraY = -2 * framing * (center[1] - 0.5);
  camera.position.set(cameraX, cameraY, REFERENCE_CAMERA_Z);
  camera.lookAt(cameraX, cameraY, 0);
  const depthMaterial = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  const previousTarget = renderer.getRenderTarget();
  const previousOverride = scene.overrideMaterial;
  try {
    scene.overrideMaterial = depthMaterial;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    return target;
  } catch (error) {
    target.dispose();
    throw error;
  } finally {
    scene.overrideMaterial = previousOverride;
    renderer.setRenderTarget(previousTarget);
    depthMaterial.dispose();
  }
}

function applyReferenceProjection(object, pivot, texture, depthTexture, strengthUniform, depthBiasUniform, frontPoseUniform, apertureUniforms, secondaryUniforms, { framing, center, aspect, pencil }) {
  pivot.updateWorldMatrix(true, true);
  const pivotInverse = pivot.matrixWorld.clone().invert();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const patchedMaterials = new Set();
  const projectionGeometries = new Set();

  object.traverse((node) => {
    if (!node.isMesh || !node.geometry?.attributes.position) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (!materials.some((material) => material?.isMeshStandardMaterial)) return;
    // A shared geometry may appear at more than one transform in a GLB.
    // Each instance needs its own fixed reference coordinates.
    if (projectionGeometries.has(node.geometry)) node.geometry = node.geometry.clone();
    projectionGeometries.add(node.geometry);
    const geometry = node.geometry;
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const toPivot = new THREE.Matrix4().multiplyMatrices(pivotInverse, node.matrixWorld);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(toPivot);
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const uv = new Float32Array(positions.count * 2);
    const facing = new Float32Array(positions.count);
    const depth = new Float32Array(positions.count);
    const motionX = new Float32Array(positions.count * 3);
    const motionY = new Float32Array(positions.count * 3);
    const motionGradient = new Float32Array(positions.count * 3);
    const toLocalDirection = new THREE.Matrix3().setFromMatrix4(toPivot).invert();
    const localX = new THREE.Vector3(1, 0, 0).applyMatrix3(toLocalDirection);
    const localY = new THREE.Vector3(0, 1, 0).applyMatrix3(toLocalDirection);
    const uvGradient = new THREE.Vector3(toPivot.elements[1], toPivot.elements[5], toPivot.elements[9]).divideScalar(2 * framing);
    for (let index = 0; index < positions.count; index += 1) {
      position.fromBufferAttribute(positions, index).applyMatrix4(toPivot);
      normal.fromBufferAttribute(normals, index).applyMatrix3(normalMatrix).normalize();
      uv[index * 2] = position.x / (2 * framing * aspect) + center[0];
      uv[index * 2 + 1] = position.y / (2 * framing) + center[1];
      facing[index] = normal.z;
      depth[index] = (REFERENCE_CAMERA_Z - position.z - REFERENCE_NEAR) / (REFERENCE_FAR - REFERENCE_NEAR);
      localX.toArray(motionX, index * 3);
      localY.toArray(motionY, index * 3);
      uvGradient.toArray(motionGradient, index * 3);
    }
    geometry.setAttribute('referenceUv', new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute('referenceFacing', new THREE.BufferAttribute(facing, 1));
    geometry.setAttribute('referenceDepth', new THREE.BufferAttribute(depth, 1));
    geometry.setAttribute('referenceMotionX', new THREE.BufferAttribute(motionX, 3));
    geometry.setAttribute('referenceMotionY', new THREE.BufferAttribute(motionY, 3));
    geometry.setAttribute('referenceMotionGradient', new THREE.BufferAttribute(motionGradient, 3));

    for (const material of materials) {
      if (!material?.isMeshStandardMaterial || patchedMaterials.has(material)) continue;
      patchedMaterials.add(material);
      const previousCompile = material.onBeforeCompile;
      const previousCacheKey = material.customProgramCacheKey();
      material.customProgramCacheKey = () => `${previousCacheKey}|mad-reference-projection-v12-front-shell-${pencil ? 'pencil' : 'plain'}`;
      material.onBeforeCompile = function (shader, renderer) {
        previousCompile.call(this, shader, renderer);
        shader.uniforms.referenceMap = { value: texture };
        shader.uniforms.referenceDepthMap = { value: depthTexture };
        shader.uniforms.referenceStrength = strengthUniform;
        shader.uniforms.referenceDepthBias = depthBiasUniform;
        shader.uniforms.referenceFrontPose = frontPoseUniform;
        Object.assign(shader.uniforms, apertureUniforms);
        Object.assign(shader.uniforms, secondaryUniforms);
        shader.vertexShader = `
attribute vec2 referenceUv;
attribute float referenceFacing;
attribute float referenceDepth;
attribute vec3 referenceMotionX;
attribute vec3 referenceMotionY;
attribute vec3 referenceMotionGradient;
uniform vec2 secondaryOffset;
uniform vec2 secondaryRegion;
varying vec2 vReferenceUv;
varying float vReferenceFacing;
varying float vReferenceDepth;
${shader.vertexShader}`.replace('#include <beginnormal_vertex>', `
#include <beginnormal_vertex>
float secondarySpan = max(0.001, secondaryRegion.y - secondaryRegion.x);
float secondaryT = clamp((referenceUv.y - secondaryRegion.x) / secondarySpan, 0.0, 1.0);
float secondaryWeight = secondaryT * secondaryT * (3.0 - 2.0 * secondaryT);
vec3 secondaryDelta = referenceMotionX * secondaryOffset.x + referenceMotionY * secondaryOffset.y;
vec3 secondaryGradient = referenceMotionGradient * (6.0 * secondaryT * (1.0 - secondaryT) / secondarySpan);
// Inverse-transpose of the small bend's Jacobian keeps side lighting coherent.
objectNormal -= secondaryGradient * dot(secondaryDelta, objectNormal)
  / max(0.1, 1.0 + dot(secondaryGradient, secondaryDelta));
#ifdef USE_TANGENT
objectTangent += secondaryDelta * dot(secondaryGradient, objectTangent);
#endif
`).replace('#include <begin_vertex>', `
#include <begin_vertex>
transformed += secondaryDelta * secondaryWeight;
vReferenceUv = referenceUv;
vReferenceFacing = referenceFacing;
vReferenceDepth = referenceDepth;`);
        shader.fragmentShader = `
uniform sampler2D referenceMap;
uniform sampler2D referenceDepthMap;
uniform float referenceStrength;
uniform float referenceDepthBias;
uniform float referenceFrontPose;
${EYE_APERTURE_GLSL}
${pencil ? BUBBLE_PENCIL_HEAD_CUTOUT_GLSL : ''}
varying vec2 vReferenceUv;
varying float vReferenceFacing;
varying float vReferenceDepth;
${shader.fragmentShader}`.replace('#include <colorspace_fragment>', `
// Preserve the reference's baked art direction on the front surface. Fixed
// mesh UVs turn with the geometry; lighting remains dynamic at the sides.
${pencil ? BUBBLE_PENCIL_HEAD_CUTOUT_FRAGMENT : ''}
// Eye openings are fixed in head space. The independent spheres behind them
// supply the moving iris and sclera, while skin, lids and glasses stay intact.
if (vReferenceDepth < ${(REFERENCE_CAMERA_Z - REFERENCE_NEAR) / (REFERENCE_FAR - REFERENCE_NEAR)}
    && avatarEyeOpening(vReferenceUv) > 0.5) discard;
vec4 referenceColor = texture2D(referenceMap, vReferenceUv);
float referenceInside = step(0.0, vReferenceUv.x) * step(vReferenceUv.x, 1.0)
  * step(0.0, vReferenceUv.y) * step(vReferenceUv.y, 1.0);
float referenceNearestDepth = texture2D(referenceDepthMap, vReferenceUv).x;
// A single depth texel at a triangle edge can falsely occlude its own surface.
// Accept the farthest front sample in a tiny square, keeping genuine occlusion
// inside glasses/hair while allowing a narrow tolerance along their edges.
vec2 referenceDepthStep = 1.5 / vec2(textureSize(referenceDepthMap, 0));
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv + vec2(referenceDepthStep.x, 0.0)).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv - vec2(referenceDepthStep.x, 0.0)).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv + vec2(0.0, referenceDepthStep.y)).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv - vec2(0.0, referenceDepthStep.y)).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv + referenceDepthStep).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv - referenceDepthStep).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv + vec2(referenceDepthStep.x, -referenceDepthStep.y)).x);
referenceNearestDepth = max(referenceNearestDepth, texture2D(referenceDepthMap, vReferenceUv + vec2(-referenceDepthStep.x, referenceDepthStep.y)).x);
float referenceBehind = (vReferenceDepth - referenceNearestDepth) * ${(REFERENCE_FAR - REFERENCE_NEAR).toFixed(2)};
float referenceDepthVisible = 1.0 - smoothstep(referenceDepthBias, referenceDepthBias + 0.015, referenceBehind);
// Small head turns reveal folds in the generated front shell. Give these
// surfaces continuous artwork instead of alternating original/generated skin.
// Deeper rear surfaces remain occluded; larger lab angles use strict depth.
float referenceShellVisible = 1.0 - smoothstep(0.2, 0.3, referenceBehind);
float referencePivotZ = 5.99 - 9.99 * vReferenceDepth;
float referenceFrontShell = smoothstep(0.0, 0.06, referencePivotZ);
float referenceVisible = mix(referenceDepthVisible, max(referenceFrontShell, referenceShellVisible), referenceFrontPose);
// Source alpha and depth define coverage. Normal-dependent edge blending can
// expose mismatched side colors in isolated triangles on the cheek contour.
float referenceWeight = referenceColor.a * referenceInside * referenceVisible * referenceStrength;
gl_FragColor.rgb = mix(gl_FragColor.rgb, referenceColor.rgb, referenceWeight);
#include <colorspace_fragment>`);
      };
      material.needsUpdate = true;
    }
  });
  return patchedMaterials.size;
}

/**
 * Mount an actual GLB above an existing poster. The caller owns poster visibility
 * through `.avatar-3d-ready`; failed or aborted loads leave the poster intact.
 * Rotation angles are radians. setRotation applies offsets from rotationY.
 * Resolves after loading; onReady runs only after the first successful frame.
 */
export async function mountAvatar3D({
  container,
  poster,
  modelUrl,
  signal,
  onReady,
  onError,
  framing = 1.10,
  rotationY = 0,
  scaleX = 1,
  cameraOffsetY = 0,
  lighting = 'studio',
  exposure = 1.0,
  environmentIntensity = 0.7,
  keyIntensity = 2.0,
  referenceTextureUrl,
  referenceStrength = 0.98,
  referenceFraming = 1.10573600553,
  referenceCenter = [0.5003125, 0.5153125],
  referenceAspect = null,
  referenceDepthBias = 0.015,
  eyes = [],
  pencil = false,
  secondaryMotion = {},
  gazeScope = 'container',
} = {}) {
  if (!container || !poster || !modelUrl) {
    throw new Error('The 3D avatar requires a container, poster and GLB URL.');
  }
  if (signal?.aborted) throw new DOMException('Avatar load aborted.', 'AbortError');

  const canvas = document.createElement('canvas');
  canvas.className = 'avatar-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', display: 'block', pointerEvents: 'none' });

  let disposeViewportGaze;
  let renderer;
  let environmentTarget;
  let referenceTexture;
  let referenceDepthTarget;
  let referenceMaterials = 0;
  let eyeRig;
  let pencilRig;
  let keyLight;
  let model;
  let disposed = false;
  let loaded = false;
  let ready = false;
  let active = true;
  let frameId = 0;
  let lastFrameTime = 0;
  let dirty = true;
  let pointerYaw = 0;
  let pointerPitch = 0;
  let manualOverride = false;
  let motionMode = 'live';
  let idleElapsed = 0;
  let manualYaw = 0;
  let manualPitch = 0;
  let currentYaw = 0;
  let currentPitch = 0;
  let pointerGazeX = 0;
  let pointerGazeY = 0;
  let currentGazeX = 0;
  let currentGazeY = 0;
  let secondaryX = 0;
  let secondaryY = 0;
  let secondaryVelocityX = 0;
  let secondaryVelocityY = 0;
  let previousHeadVelocityX = 0;
  let previousHeadVelocityY = 0;
  let resizeObserver;
  let routeObserver;
  let width = 0;
  let height = 0;
  let renderedFrames = 0;
  let detailZoom = 1;
  let resources = { meshes: 0, nodes: 0, triangles: 0, textures: new Set(), materials: new Set(), meshNames: [] };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loadAbort = new AbortController();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const cameraY = Number.isFinite(cameraOffsetY) ? cameraOffsetY : 0;
  camera.position.set(0, cameraY, 6);
  camera.lookAt(0, cameraY, 0);

  const appearance = {
    exposure: Number.isFinite(exposure) ? Math.max(0, exposure) : 1.0,
    environmentIntensity: Number.isFinite(environmentIntensity) ? Math.max(0, environmentIntensity) : 0.7,
    keyIntensity: Number.isFinite(keyIntensity) ? Math.max(0, keyIntensity) : 2.0,
    referenceStrength: Number.isFinite(referenceStrength) ? THREE.MathUtils.clamp(referenceStrength, 0, 1) : 0.98,
    referenceDepthBias: Number.isFinite(referenceDepthBias) ? THREE.MathUtils.clamp(referenceDepthBias, 0, 0.05) : 0.015,
  };
  const referenceStrengthUniform = { value: appearance.referenceStrength };
  const referenceDepthBiasUniform = { value: appearance.referenceDepthBias };
  const referenceFrontPoseUniform = { value: 1 };
  const calibratedEyes = (Array.isArray(eyes) ? eyes : []).slice(0, 2);
  const gazeEnabled = Boolean(referenceTextureUrl && calibratedEyes.length);
  const secondaryEnabled = Boolean(referenceTextureUrl && secondaryMotion !== false && secondaryMotion?.enabled !== false);
  const secondaryStart = Number.isFinite(secondaryMotion?.start) ? THREE.MathUtils.clamp(secondaryMotion.start, 0, 0.95) : 0.68;
  const secondaryEnd = Number.isFinite(secondaryMotion?.end) && secondaryMotion.end > secondaryStart
    ? Math.min(1, secondaryMotion.end) : Math.min(1, Math.max(0.85, secondaryStart + 0.05));
  const secondaryLimit = Number.isFinite(secondaryMotion?.maxDisplacement)
    ? THREE.MathUtils.clamp(secondaryMotion.maxDisplacement, 0, 0.01) : 0.008;
  const secondaryUniforms = {
    secondaryOffset: { value: new THREE.Vector2() },
    secondaryRegion: { value: new THREE.Vector2(secondaryStart, secondaryEnd) },
  };

  const controller = {
    dispose,
    setZoom(value = 1) {
      if (disposed) return;
      detailZoom = Number.isFinite(value) ? THREE.MathUtils.clamp(value, 1, 3) : 1;
      updateCameraZoom();
      invalidate();
    },
    setActive(value) {
      if (disposed) return;
      active = Boolean(value);
      updateActivity();
    },
    setRotation(value = {}, pitch = 0) {
      if (disposed) return;
      manualOverride = value !== null;
      motionMode = manualOverride ? 'still' : 'live';
      idleElapsed = 0;
      const yaw = typeof value === 'number' ? value : value?.yaw ?? 0;
      const nextPitch = typeof value === 'number' ? pitch : value?.pitch ?? 0;
      manualYaw = Number.isFinite(yaw) ? yaw : 0;
      manualPitch = Number.isFinite(nextPitch) ? nextPitch : 0;
      pointerYaw = 0;
      pointerPitch = 0;
      clearGaze();
      clearSecondary();
      if (motion.matches) {
        currentYaw = manualYaw;
        currentPitch = manualPitch;
      }
      invalidate();
    },
    setMotionMode(value) {
      if (disposed) return;
      if (!['live', 'eyes', 'still'].includes(value)) throw new RangeError('Unknown avatar motion mode.');
      motionMode = value;
      manualOverride = value === 'still';
      manualYaw = manualOverride ? currentYaw : 0;
      manualPitch = manualOverride ? currentPitch : 0;
      if (!manualOverride) {
        currentYaw = 0;
        currentPitch = 0;
      }
      idleElapsed = 0;
      pointerYaw = 0;
      pointerPitch = 0;
      clearGaze();
      clearSecondary();
      invalidate();
    },
    setAppearance(values = {}) {
      if (disposed || !values) return;
      let changed = false;
      for (const property of ['exposure', 'environmentIntensity', 'keyIntensity', 'referenceStrength', 'referenceDepthBias']) {
        if (!Number.isFinite(values[property])) continue;
        const value = property === 'referenceStrength' || property === 'referenceDepthBias'
          ? THREE.MathUtils.clamp(values[property], 0, property === 'referenceStrength' ? 1 : 0.05)
          : Math.max(0, values[property]);
        if (appearance[property] === value) continue;
        appearance[property] = value;
        changed = true;
      }
      if (!changed) return;
      renderer.toneMappingExposure = appearance.exposure;
      scene.environmentIntensity = appearance.environmentIntensity;
      keyLight.intensity = appearance.keyIntensity;
      referenceStrengthUniform.value = appearance.referenceStrength;
      referenceDepthBiasUniform.value = appearance.referenceDepthBias;
      invalidate();
    },
    getMetrics() {
      return {
        ready,
        active: canRender(),
        disposed,
        meshes: resources.meshes,
        nodes: resources.nodes,
        meshNames: [...resources.meshNames],
        modelTriangles: Math.round(resources.triangles),
        triangles: renderer?.info.render.triangles ?? 0,
        drawCalls: renderer?.info.render.calls ?? 0,
        textures: resources.textures.size,
        materials: resources.materials.size,
        renderedFrames,
        width,
        height,
        pixelRatio: renderer?.getPixelRatio() ?? 0,
        lighting: lighting === 'legacy' ? 'legacy' : 'studio',
        referenceProjection: referenceMaterials > 0,
        referenceOcclusion: Boolean(referenceDepthTarget),
        motionMode,
        idle: motionMode === 'live' && !motion.matches && canRender(),
        secondaryMotion: {
          enabled: secondaryEnabled,
          offset: secondaryUniforms.secondaryOffset.value.toArray(),
          maxDisplacement: secondaryLimit,
          region: [secondaryStart, secondaryEnd],
        },
        gaze: {
          enabled: gazeEnabled,
          eyes: gazeEnabled ? calibratedEyes.length : 0,
          target: [pointerGazeX, pointerGazeY],
          current: [currentGazeX, currentGazeY],
          rig: eyeRig?.getMetrics(),
          headLimitsDegrees: [1.5, 1],
        },
        pencil: pencilRig?.getMetrics() ?? { enabled: false },
        appearance: { ...appearance },
      };
    },
  };

  function canRender() {
    const route = document.body.dataset.route;
    return !disposed && loaded && active && !document.hidden && (!route || route === 'landing');
  }

  function invalidate() {
    dirty = true;
    if (canRender() && !frameId) frameId = requestAnimationFrame(renderFrame);
  }

  function updateActivity() {
    if (!canRender()) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameTime = 0;
      pointerYaw = 0;
      pointerPitch = 0;
      clearGaze();
      clearSecondary();
      return;
    }
    invalidate();
  }

  function resize() {
    if (disposed || !renderer) return;
    // Layout dimensions intentionally exclude the poster's existing CSS tilt/scale.
    const nextWidth = poster.offsetWidth;
    const nextHeight = poster.offsetHeight;
    if (!nextWidth || !nextHeight) return;
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75);
    const sizeChanged = nextWidth !== width || nextHeight !== height || renderer.getPixelRatio() !== ratio;
    width = nextWidth;
    height = nextHeight;
    canvas.style.left = `${poster.offsetLeft}px`;
    canvas.style.top = `${poster.offsetTop}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (!sizeChanged) return;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    const halfHeight = Math.max(1, framing);
    const aspect = width / height;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    updateCameraZoom();
    camera.updateProjectionMatrix();
    invalidate();
  }

  function updateCameraZoom() {
    if (detailZoom === 1 || !width || !height) camera.clearViewOffset();
    else camera.setViewOffset(width, height,
      width * (1 - 1 / detailZoom) * 0.5,
      height * (1 - 1 / detailZoom) * 0.51,
      width / detailZoom, height / detailZoom);
  }

  function renderFrame(time) {
    frameId = 0;
    if (!canRender() || !width || !height) return;
    const idleRunning = motionMode === 'live' && !motion.matches;
    // Pointer-driven dirty frames remain responsive; resting idle draws at 30fps.
    if (idleRunning && !dirty && lastFrameTime && time - lastFrameTime < 1000 / 30 - 0.5) {
      frameId = requestAnimationFrame(renderFrame);
      return;
    }
    const previousYaw = currentYaw;
    const previousPitch = currentPitch;
    const previousGazeX = currentGazeX;
    const previousGazeY = currentGazeY;
    const delta = Math.min(lastFrameTime ? (time - lastFrameTime) / 1000 : 1 / 60, 0.05);
    lastFrameTime = time;
    if (idleRunning) idleElapsed += delta;
    const idleYaw = idleRunning ? Math.sin(idleElapsed * Math.PI * 2 / 8.4) * THREE.MathUtils.degToRad(0.2) : 0;
    const idlePitch = idleRunning ? Math.sin(idleElapsed * Math.PI * 2 / 9.7) * THREE.MathUtils.degToRad(0.1) : 0;
    const targetYaw = motionMode === 'eyes' ? 0 : manualYaw + (motion.matches ? 0 : pointerYaw + idleYaw);
    const targetPitch = motionMode === 'eyes' ? 0 : manualPitch + (motion.matches ? 0 : pointerPitch + idlePitch);
    const damping = motion.matches ? 1 : 1 - Math.exp(-11 * delta);
    currentYaw += (targetYaw - currentYaw) * damping;
    currentPitch += (targetPitch - currentPitch) * damping;
    const headMoving = Math.abs(targetYaw - currentYaw) > SETTLE_EPSILON || Math.abs(targetPitch - currentPitch) > SETTLE_EPSILON;
    if (!headMoving) {
      currentYaw = targetYaw;
      currentPitch = targetPitch;
    }
    const targetGazeX = gazeEnabled && !motion.matches && !manualOverride ? pointerGazeX : 0;
    const targetGazeY = gazeEnabled && !motion.matches && !manualOverride ? pointerGazeY : 0;
    const gazeDamping = motion.matches ? 1 : 1 - Math.exp(-16 * delta);
    currentGazeX += (targetGazeX - currentGazeX) * gazeDamping;
    currentGazeY += (targetGazeY - currentGazeY) * gazeDamping;
    const gazeMoving = Math.abs(targetGazeX - currentGazeX) > GAZE_SETTLE_EPSILON
      || Math.abs(targetGazeY - currentGazeY) > GAZE_SETTLE_EPSILON;
    if (!gazeMoving) {
      currentGazeX = targetGazeX;
      currentGazeY = targetGazeY;
    }
    eyeRig?.setGaze(currentGazeX, currentGazeY);
    const previousSecondaryX = secondaryX;
    const previousSecondaryY = secondaryY;
    if (idleRunning && secondaryEnabled) {
      const headVelocityX = (currentYaw - previousYaw) / delta;
      const headVelocityY = (currentPitch - previousPitch) / delta;
      const accelerationX = (headVelocityX - previousHeadVelocityX) / delta;
      const accelerationY = (headVelocityY - previousHeadVelocityY) / delta;
      previousHeadVelocityX = headVelocityX;
      previousHeadVelocityY = headVelocityY;
      const targetX = THREE.MathUtils.clamp(-accelerationX * 0.00025 - headVelocityX * 0.015 - currentYaw * 0.08, -secondaryLimit, secondaryLimit);
      const targetY = THREE.MathUtils.clamp(accelerationY * 0.00015 + headVelocityY * 0.008 + currentPitch * 0.05, -secondaryLimit * 0.5, secondaryLimit * 0.5);
      secondaryVelocityX += ((targetX - secondaryX) * 90 - secondaryVelocityX * 14) * delta;
      secondaryVelocityY += ((targetY - secondaryY) * 90 - secondaryVelocityY * 14) * delta;
      secondaryX += secondaryVelocityX * delta;
      secondaryY += secondaryVelocityY * delta;
      if (Math.abs(secondaryX) > secondaryLimit) {
        secondaryX = Math.sign(secondaryX) * secondaryLimit;
        secondaryVelocityX = 0;
      }
      if (Math.abs(secondaryY) > secondaryLimit * 0.5) {
        secondaryY = Math.sign(secondaryY) * secondaryLimit * 0.5;
        secondaryVelocityY = 0;
      }
      secondaryUniforms.secondaryOffset.value.set(secondaryX, secondaryY);
    } else {
      clearSecondary();
    }
    const moving = headMoving || gazeMoving;
    pencilRig?.setSway(secondaryX * 0.7);
    // Draw the final snap to the exact target, then stop scheduling frames.
    const poseChanged = currentYaw !== previousYaw || currentPitch !== previousPitch
      || currentGazeX !== previousGazeX || currentGazeY !== previousGazeY
      || secondaryX !== previousSecondaryX || secondaryY !== previousSecondaryY;
    if (dirty || moving || poseChanged) {
      pivot.rotation.set(currentPitch, currentYaw, 0, 'YXZ');
      referenceFrontPoseUniform.value = 1 - THREE.MathUtils.smoothstep(
        Math.hypot(currentYaw, currentPitch), THREE.MathUtils.degToRad(3), THREE.MathUtils.degToRad(10),
      );
      try {
        renderer.render(scene, camera);
      } catch (error) {
        fail(error);
        return;
      }
      dirty = false;
      renderedFrames += 1;
      if (!ready) {
        ready = true;
        container.classList.add('avatar-3d-ready');
        onReady?.(controller);
      }
    }
    if ((moving || idleRunning) && canRender()) {
      if (!frameId) frameId = requestAnimationFrame(renderFrame);
    } else if (!frameId) {
      lastFrameTime = 0;
    }
  }

  function pointerMove(event) {
    if (event.pointerType === 'touch') {
      resetPointer();
      return;
    }
    if (!canRender() || motion.matches || manualOverride) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normalizedX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const normalizedY = THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    pointerYaw = motionMode === 'live' ? normalizedX * YAW_LIMIT : 0;
    pointerPitch = motionMode === 'live' ? normalizedY * PITCH_LIMIT : 0;
    if (gazeScope !== 'viewport') {
      pointerGazeX = gazeEnabled ? normalizedX : 0;
      pointerGazeY = gazeEnabled ? -normalizedY : 0;
    }
    invalidate();
  }

  function leaveContainer() {
    pointerYaw = 0;
    pointerPitch = 0;
    if (gazeScope !== 'viewport') resetPointer();
    else invalidate();
  }

  function resetPointer() {
    pointerYaw = 0;
    pointerPitch = 0;
    pointerGazeX = 0;
    pointerGazeY = 0;
    invalidate();
  }

  function clearGaze() {
    pointerGazeX = 0;
    pointerGazeY = 0;
    currentGazeX = 0;
    currentGazeY = 0;
    eyeRig?.setGaze(0, 0);
  }

  function clearSecondary() {
    secondaryX = 0;
    secondaryY = 0;
    secondaryVelocityX = 0;
    secondaryVelocityY = 0;
    previousHeadVelocityX = 0;
    previousHeadVelocityY = 0;
    secondaryUniforms.secondaryOffset.value.set(0, 0);
    pencilRig?.setSway(0);
  }

  function pointerDown(event) {
    if (event.pointerType === 'touch') resetPointer();
  }

  function motionChange() {
    resetPointer();
    clearGaze();
    clearSecondary();
    if (motion.matches) {
      currentYaw = manualYaw;
      currentPitch = manualPitch;
    }
  }

  function contextLost(event) {
    event.preventDefault();
    if (!disposed) fail(new Error('The avatar WebGL context was lost.'));
  }

  function abort() {
    dispose();
  }

  function fail(error) {
    if (disposed) return;
    dispose();
    onError?.(error);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    clearGaze();
    clearSecondary();
    loadAbort.abort();
    cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    routeObserver?.disconnect();
    signal?.removeEventListener('abort', abort);
    container.removeEventListener('pointermove', pointerMove);
    container.removeEventListener('pointerdown', pointerDown);
    container.removeEventListener('pointerleave', leaveContainer);
    disposeViewportGaze?.();
    container.removeEventListener('pointercancel', resetPointer);
    document.removeEventListener('visibilitychange', updateActivity);
    window.removeEventListener('resize', resize);
    motion.removeEventListener('change', motionChange);
    canvas.removeEventListener('webglcontextlost', contextLost);
    container.classList.remove('avatar-3d-ready');
    eyeRig?.dispose();
    eyeRig = null;
    pencilRig?.dispose();
    pencilRig = null;
    disposeModel(model);
    model = null;
    referenceTexture?.source?.data?.close?.();
    referenceTexture?.dispose();
    referenceTexture = null;
    referenceDepthTarget?.dispose();
    referenceDepthTarget = null;
    referenceMaterials = 0;
    scene.environment = null;
    environmentTarget?.dispose();
    environmentTarget = null;
    scene.clear();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas.remove();
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const legacyLighting = lighting === 'legacy';
    renderer.toneMapping = legacyLighting ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    renderer.toneMappingExposure = appearance.exposure;
    scene.environmentIntensity = appearance.environmentIntensity;
    if (!legacyLighting) {
      environmentTarget = createStudioEnvironment(renderer);
      scene.environment = environmentTarget.texture;
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x33384a, legacyLighting ? 2.0 : 0.22));
    const lights = legacyLighting ? [
      [0xffffff, appearance.keyIntensity, [3, 4, 5]],
      [0xdce2ff, 1.0, [-4, 1, 3]],
      [0xffffff, 1.4, [1, 2, -4]],
    ] : [
      [0xfff3e9, appearance.keyIntensity, [-3.5, 4, 5]],
      [0xe5edff, 0.35, [4, 1, 3]],
      [0xffffff, 1.1, [2, 2, -4]],
    ];
    for (const [color, intensity, position] of lights) {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...position);
      scene.add(light);
      keyLight ||= light;
    }
    container.appendChild(canvas);
    canvas.addEventListener('webglcontextlost', contextLost);
    container.addEventListener('pointermove', pointerMove, { passive: true });
    container.addEventListener('pointerdown', pointerDown, { passive: true });
    container.addEventListener('pointerleave', leaveContainer, { passive: true });
    if (gazeScope === 'viewport') disposeViewportGaze = bindViewportGaze({
      getRect: () => container.getBoundingClientRect(),
      enabled: () => canRender() && gazeEnabled && !motion.matches && !manualOverride,
      onGaze: (x, y) => { pointerGazeX = x; pointerGazeY = y; invalidate(); },
      onReset: resetPointer,
    });
    container.addEventListener('pointercancel', resetPointer, { passive: true });
    document.addEventListener('visibilitychange', updateActivity);
    window.addEventListener('resize', resize, { passive: true });
    motion.addEventListener('change', motionChange);
    signal?.addEventListener('abort', abort, { once: true });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(poster);
    routeObserver = new MutationObserver(updateActivity);
    routeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-route'] });
    resize();

    const absoluteUrl = new URL(modelUrl, window.location.href);
    const response = await fetch(absoluteUrl, { signal: loadAbort.signal });
    if (!response.ok) throw new Error(`Avatar GLB request failed (${response.status}).`);
    const buffer = await response.arrayBuffer();
    const gltf = await new GLTFLoader().parseAsync(buffer, new URL('.', absoluteUrl).href);
    if (disposed || signal?.aborted) {
      for (const gltfScene of gltf.scenes) disposeModel(gltfScene);
      throw new DOMException('Avatar load aborted.', 'AbortError');
    }
    model = gltf.scene;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.y) || size.y <= 0) {
      throw new Error('The avatar GLB does not contain visible geometry.');
    }
    const normalizer = new THREE.Group();
    const scale = 2 / size.y;
    normalizer.scale.setScalar(scale);
    normalizer.position.copy(center).multiplyScalar(-scale);
    normalizer.add(model);
    // Orient the source model before pointer rotation, keeping pitch aligned to
    // the viewer even when the generated GLB faces +X instead of +Z.
    const orientation = new THREE.Group();
    orientation.rotation.y = rotationY;
    orientation.add(normalizer);
    // Scale after source orientation so X always means the viewer's horizontal.
    const viewScale = new THREE.Group();
    viewScale.scale.x = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
    viewScale.add(orientation);
    pivot.add(viewScale);
    if (referenceTextureUrl) {
      const reference = await new THREE.TextureLoader().loadAsync(new URL(referenceTextureUrl, window.location.href).href);
      if (disposed || signal?.aborted) {
        reference.source?.data?.close?.();
        reference.dispose();
        throw new DOMException('Avatar load aborted.', 'AbortError');
      }
      referenceTexture = reference;
      referenceTexture.colorSpace = THREE.SRGBColorSpace;
      referenceTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const imageAspect = (reference.source.data.naturalWidth || reference.source.data.width)
        / (reference.source.data.naturalHeight || reference.source.data.height);
      const projection = {
        framing: Number.isFinite(referenceFraming) && referenceFraming > 0 ? referenceFraming : 1.10573600553,
        center: [
          Number.isFinite(referenceCenter?.[0]) ? referenceCenter[0] : 0.5003125,
          Number.isFinite(referenceCenter?.[1]) ? referenceCenter[1] : 0.5153125,
        ],
        aspect: Number.isFinite(referenceAspect) && referenceAspect > 0 ? referenceAspect : imageAspect || 1,
        pencil: Boolean(pencil),
      };
      // Capture visibility once in the original front view. Hidden skin must not
      // inherit pixels from glasses or hair that sit in front of it.
      referenceDepthTarget = captureReferenceDepth(renderer, scene, referenceTexture, projection);
      eyeRig = createAvatarEyes({
        parent: pivot, referenceTexture,
        framing: projection.framing, referenceCenter: projection.center,
        referenceAspect: projection.aspect, eyes: calibratedEyes,
      });
      if (pencil) pencilRig = createAvatarPencil({
        parent: pivot, referenceTexture,
        framing: projection.framing, referenceCenter: projection.center,
        referenceAspect: projection.aspect,
      });
      referenceMaterials = applyReferenceProjection(
        model, pivot, referenceTexture, referenceDepthTarget.depthTexture,
        referenceStrengthUniform, referenceDepthBiasUniform, referenceFrontPoseUniform, eyeRig.apertureUniforms, secondaryUniforms, projection,
      );
    }
    resources = modelResources(model);
    if (referenceTexture) resources.textures.add(referenceTexture);
    if (referenceDepthTarget) resources.textures.add(referenceDepthTarget.depthTexture);
    loaded = true;
    invalidate();
    return controller;
  } catch (error) {
    if (!disposed) fail(error);
    throw error;
  }
}
