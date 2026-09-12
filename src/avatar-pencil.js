import * as THREE from 'three';

// Calibrated from Bubble's unchanged 1600px reference. These coordinates live
// in the head pivot, after normalization to height 2 and source orientation.
const SOURCE_SIZE = 1600;
const TIP_PIXEL = [1303, 573];
const BASE_PIXEL = [1264, 805];
const PENCIL_DEPTH = -0.32;

// The generated head fused the pencil with an oversized, sideways ear lobe.
// Restrict removal to that thin outer slab: front hair and rear scalp stay put,
// and the real ear below source row 752 stays in front of the replacement.
export const BUBBLE_PENCIL_HEAD_CUTOUT_GLSL = `
bool bubblePencilHeadCutout(vec2 fixedReferenceUv, float fixedReferenceDepth) {
  vec2 sourcePixel = vec2(fixedReferenceUv.x, 1.0 - fixedReferenceUv.y) * 1600.0;
  float pivotZ = 6.0 - 0.01 - fixedReferenceDepth * 9.99;
  return sourcePixel.x > 1258.0 && sourcePixel.x < 1360.0
    && sourcePixel.y > 530.0 && sourcePixel.y < 752.0
    && pivotZ > -0.46 && pivotZ < -0.08;
}
`;

// Inject only into Bubble's head shader, after its reference varyings exist.
// The reference-depth capture may retain the old slab; the pencil's own
// reference material below deliberately does not sample that captured depth.
export const BUBBLE_PENCIL_HEAD_CUTOUT_FRAGMENT = `
if (bubblePencilHeadCutout(vReferenceUv, vReferenceDepth)) discard;
`;

function applyPencilReference(mesh, parent, referenceTexture, framing, center, aspect) {
  parent.updateWorldMatrix(true, true);
  const toPivot = parent.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(toPivot);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const positions = mesh.geometry.attributes.position;
  const normals = mesh.geometry.attributes.normal;
  const uv = new Float32Array(positions.count * 2);
  const facing = new Float32Array(positions.count);
  for (let index = 0; index < positions.count; index += 1) {
    position.fromBufferAttribute(positions, index).applyMatrix4(toPivot);
    normal.fromBufferAttribute(normals, index).applyMatrix3(normalMatrix).normalize();
    uv[index * 2] = position.x / (2 * framing * aspect) + center[0];
    uv[index * 2 + 1] = position.y / (2 * framing) + center[1];
    facing[index] = normal.z;
  }
  mesh.geometry.setAttribute('pencilReferenceUv', new THREE.BufferAttribute(uv, 2));
  mesh.geometry.setAttribute('pencilReferenceFacing', new THREE.BufferAttribute(facing, 1));
  mesh.material.customProgramCacheKey = () => 'mad-bubble-pencil-reference-v1';
  mesh.material.onBeforeCompile = (shader) => {
    shader.uniforms.pencilReferenceMap = { value: referenceTexture };
    shader.vertexShader = `
attribute vec2 pencilReferenceUv;
attribute float pencilReferenceFacing;
varying vec2 vPencilReferenceUv;
varying float vPencilReferenceFacing;
${shader.vertexShader}`.replace('#include <begin_vertex>', `
#include <begin_vertex>
vPencilReferenceUv = pencilReferenceUv;
vPencilReferenceFacing = pencilReferenceFacing;`);
    shader.fragmentShader = `
uniform sampler2D pencilReferenceMap;
varying vec2 vPencilReferenceUv;
varying float vPencilReferenceFacing;
${shader.fragmentShader}`.replace('#include <colorspace_fragment>', `
vec4 pencilReferenceColor = texture2D(pencilReferenceMap, vPencilReferenceUv);
float pencilSourceY = (1.0 - vPencilReferenceUv.y) * 1600.0;
// Never paint the ear onto the concealed lower shaft. It becomes plain ceramic
// when a turn reveals it, while the upper shaft keeps the approved shading.
float pencilReferenceRegion = step(0.0, vPencilReferenceUv.x)
  * step(vPencilReferenceUv.x, 1.0)
  * step(570.0, pencilSourceY) * (1.0 - smoothstep(749.0, 755.0, pencilSourceY));
float pencilReferenceWeight = pencilReferenceRegion * pencilReferenceColor.a
  * smoothstep(0.05, 0.55, vPencilReferenceFacing) * 0.98;
// The lower-left shaft sits behind the hair in the artwork. If a turn reveals
// it, keep the ceramic material instead of carrying hair pixels on the pencil.
float concealedHair = smoothstep(695.0, 715.0, pencilSourceY)
  * (1.0 - smoothstep(1258.0, 1264.0, vPencilReferenceUv.x * 1600.0));
pencilReferenceWeight *= 1.0 - concealedHair;
gl_FragColor.rgb = mix(gl_FragColor.rgb, pencilReferenceColor.rgb, pencilReferenceWeight);
#include <colorspace_fragment>`);
  };
}

/** Create Bubble's real tapered stylus behind its viewer-right ear. */
export function createAvatarPencil({
  parent,
  referenceTexture,
  framing = 1600 / 1430,
  referenceCenter = [0.5, 0.510625],
  referenceAspect = 1,
} = {}) {
  if (!parent?.isObject3D || !referenceTexture?.isTexture) {
    throw new TypeError('The Bubble pencil requires its head pivot and reference texture.');
  }
  const sourceToPivot = ([x, y]) => new THREE.Vector3(
    (x / SOURCE_SIZE - referenceCenter[0]) * 2 * framing * referenceAspect,
    (1 - y / SOURCE_SIZE - referenceCenter[1]) * 2 * framing,
    PENCIL_DEPTH,
  );
  const base = sourceToPivot(BASE_PIXEL);
  const tip = sourceToPivot(TIP_PIXEL);
  const direction = tip.clone().sub(base);
  const length = direction.length();
  const unitsPerPixel = 2 * framing / SOURCE_SIZE;
  // Radial outline measured down from the original tip. A lathed profile gives
  // the nib actual volume; it is not a flat card or an extruded image mask.
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(22.5 * unitsPerPixel, 0.003),
    new THREE.Vector2(23.5 * unitsPerPixel, length - 180 * unitsPerPixel),
    new THREE.Vector2(24 * unitsPerPixel, length - 90 * unitsPerPixel),
    new THREE.Vector2(24 * unitsPerPixel, length - 68 * unitsPerPixel),
    new THREE.Vector2(24 * unitsPerPixel, length - 48 * unitsPerPixel),
    new THREE.Vector2(21.5 * unitsPerPixel, length - 38 * unitsPerPixel),
    new THREE.Vector2(17 * unitsPerPixel, length - 28 * unitsPerPixel),
    new THREE.Vector2(13 * unitsPerPixel, length - 18 * unitsPerPixel),
    new THREE.Vector2(7 * unitsPerPixel, length - 8 * unitsPerPixel),
    new THREE.Vector2(2.5 * unitsPerPixel, length - 2 * unitsPerPixel),
    new THREE.Vector2(0, length),
  ];
  const geometry = new THREE.LatheGeometry(profile, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd5cdc9,
    roughness: 0.34,
    metalness: 0,
  });
  const pencil = new THREE.Mesh(geometry, material);
  pencil.name = 'bubble-pencil';
  pencil.position.copy(base);
  pencil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  const restingRotation = pencil.quaternion.clone();
  const swayRotation = new THREE.Quaternion();
  const swayAxis = new THREE.Vector3(0, 0, 1);
  parent.add(pencil);
  applyPencilReference(pencil, parent, referenceTexture, framing, referenceCenter, referenceAspect);
  let disposed = false;
  return {
    setSway(angle = 0) {
      if (disposed) return;
      const value = Number.isFinite(angle) ? THREE.MathUtils.clamp(angle, -0.008, 0.008) : 0;
      pencil.quaternion.copy(restingRotation).premultiply(swayRotation.setFromAxisAngle(swayAxis, value));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pencil.removeFromParent();
      geometry.dispose();
      material.dispose();
      // referenceTexture is shared with the head and belongs to the caller.
    },
    getMetrics() {
      return {
        enabled: !disposed,
        meshes: 1,
        triangles: geometry.index.count / 3,
        tip: tip.toArray(),
        base: base.toArray(),
        shaftRadius: 24 * unitsPerPixel,
        length,
        referenceProjection: true,
      };
    },
  };
}
