import * as THREE from 'three';

const MAX_EYES = 2;
const MAX_APERTURE_POINTS = 16;
const MAX_YAW = THREE.MathUtils.degToRad(12);
const MAX_PITCH = THREE.MathUtils.degToRad(6);

// Both the head opening and the eyeball clip use the same fixed artwork space.
// The upper/lower arrays contain cubic Bezier Y controls; X runs left to right.
export const EYE_APERTURE_GLSL = `
uniform int avatarEyeCount;
uniform vec2 avatarEyeLeftRight[${MAX_EYES}];
uniform vec4 avatarEyeUpper[${MAX_EYES}];
uniform vec4 avatarEyeLower[${MAX_EYES}];
uniform vec4 avatarEyeRect[${MAX_EYES}];
uniform int avatarEyePointCount[${MAX_EYES}];
uniform vec3 avatarEyePoints[${MAX_EYES * MAX_APERTURE_POINTS}];

float avatarEyeCurve(vec4 controls, float t) {
  float inverseT = 1.0 - t;
  return dot(controls, vec4(
    inverseT * inverseT * inverseT,
    3.0 * inverseT * inverseT * t,
    3.0 * inverseT * t * t,
    t * t * t
  ));
}

// Returns upper/lower Y at X. Dense authored points take precedence over cubic
// curves so lids and glasses retain their exact local contours.
vec2 avatarEyeBounds(float x, int eyeIndex) {
  int pointCount = avatarEyePointCount[eyeIndex];
  if (pointCount > 1) {
    vec3 previous = avatarEyePoints[eyeIndex * ${MAX_APERTURE_POINTS}];
    for (int pointIndex = 1; pointIndex < ${MAX_APERTURE_POINTS}; pointIndex++) {
      if (pointIndex < pointCount) {
        vec3 point = avatarEyePoints[eyeIndex * ${MAX_APERTURE_POINTS} + pointIndex];
        if (x <= point.x || pointIndex == pointCount - 1) {
          float between = clamp((x - previous.x) / max(0.00001, point.x - previous.x), 0.0, 1.0);
          return mix(previous.yz, point.yz, between);
        }
        previous = point;
      }
    }
  }
  vec2 bounds = avatarEyeLeftRight[eyeIndex];
  float t = clamp((x - bounds.x) / max(0.00001, bounds.y - bounds.x), 0.0, 1.0);
  return vec2(avatarEyeCurve(avatarEyeUpper[eyeIndex], t), avatarEyeCurve(avatarEyeLower[eyeIndex], t));
}

float avatarEyeOpeningFor(vec2 uv, int eyeIndex) {
  vec2 edge = max(fwidth(uv), vec2(0.00005));
  vec4 rect = avatarEyeRect[eyeIndex];
  if (uv.x < rect.x - edge.x || uv.x > rect.y + edge.x
      || uv.y < rect.z - edge.y || uv.y > rect.w + edge.y) return 0.0;
  vec2 bounds = avatarEyeLeftRight[eyeIndex];
  vec2 vertical = avatarEyeBounds(uv.x, eyeIndex);
  float upper = vertical.x;
  float lower = vertical.y;
  float horizontal = smoothstep(bounds.x - edge.x, bounds.x + edge.x, uv.x)
    * (1.0 - smoothstep(bounds.y - edge.x, bounds.y + edge.x, uv.x));
  return horizontal * smoothstep(lower - edge.y, lower + edge.y, uv.y)
    * (1.0 - smoothstep(upper - edge.y, upper + edge.y, uv.y));
}

float avatarEyeOpening(vec2 uv) {
  float opening = 0.0;
  for (int eyeIndex = 0; eyeIndex < ${MAX_EYES}; eyeIndex++) {
    if (eyeIndex < avatarEyeCount) opening = max(opening, avatarEyeOpeningFor(uv, eyeIndex));
  }
  return opening;
}
`;

const EYE_VERTEX_SHADER = `
uniform vec3 eyeCenter;
uniform float eyeRadius;
uniform vec4 eyeQuaternion;
uniform vec2 eyeProjectionSize;
uniform vec2 eyeReferenceCenter;
varying vec3 vEyeLocal;
varying vec3 vEyePivotNormal;
varying vec2 vEyeReferenceUv;

vec3 avatarRotateEye(vec3 point, vec4 quaternion) {
  return point + 2.0 * cross(quaternion.xyz, cross(quaternion.xyz, point) + quaternion.w * point);
}

void main() {
  vEyeLocal = position * eyeRadius;
  vec3 pivotPosition = avatarRotateEye(vEyeLocal, eyeQuaternion) + eyeCenter;
  vEyePivotNormal = avatarRotateEye(normal, eyeQuaternion);
  vEyeReferenceUv = pivotPosition.xy / eyeProjectionSize + eyeReferenceCenter;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EYE_FRAGMENT_SHADER = `
uniform sampler2D eyeReferenceMap;
uniform int eyeIndex;
uniform vec2 eyeIrisCenter;
uniform float eyeIrisRadius;
uniform vec2 eyeProjectionSize;
uniform vec2 eyeReferenceTexel;
uniform vec3 eyeScleraTop;
uniform vec3 eyeScleraBottom;
uniform vec3 eyeTint;
uniform vec3 eyeFallbackBrown;
varying vec3 vEyeLocal;
varying vec3 vEyePivotNormal;
varying vec2 vEyeReferenceUv;
${EYE_APERTURE_GLSL}

vec3 avatarIrisBrown() {
  vec2 offsets[3];
  offsets[0] = vec2(-0.65, -0.15);
  offsets[1] = vec2(0.65, -0.15);
  offsets[2] = vec2(0.0, -0.7);
  vec3 total = vec3(0.0);
  float count = 0.0;
  for (int sampleIndex = 0; sampleIndex < 3; sampleIndex++) {
    vec2 uv = eyeIrisCenter + offsets[sampleIndex] * eyeIrisRadius;
    float safe = step(0.995, avatarEyeOpeningFor(uv, eyeIndex));
    total += texture2D(eyeReferenceMap, uv).rgb * safe;
    count += safe;
  }
  return count > 0.0 ? total / count : eyeFallbackBrown;
}

vec3 avatarScleraFill(vec2 uv, vec3 fallback) {
  vec2 horizontal = avatarEyeLeftRight[eyeIndex];
  float leftX = clamp(eyeIrisCenter.x - 1.35 * eyeIrisRadius, horizontal.x + 2.0 * eyeReferenceTexel.x, horizontal.y - 2.0 * eyeReferenceTexel.x);
  float rightX = clamp(eyeIrisCenter.x + 1.35 * eyeIrisRadius, horizontal.x + 2.0 * eyeReferenceTexel.x, horizontal.y - 2.0 * eyeReferenceTexel.x);
  vec2 leftBounds = avatarEyeBounds(leftX, eyeIndex);
  vec2 rightBounds = avatarEyeBounds(rightX, eyeIndex);
  float leftInset = min(2.0 * eyeReferenceTexel.y, max(0.0, leftBounds.x - leftBounds.y) * 0.25);
  float rightInset = min(2.0 * eyeReferenceTexel.y, max(0.0, rightBounds.x - rightBounds.y) * 0.25);
  vec2 leftUv = vec2(leftX, clamp(uv.y, leftBounds.y + leftInset, leftBounds.x - leftInset));
  vec2 rightUv = vec2(rightX, clamp(uv.y, rightBounds.y + rightInset, rightBounds.x - rightInset));
  float between = clamp((uv.x - leftX) / max(0.00001, rightX - leftX), 0.0, 1.0);
  float leftWeight = (1.0 - between) * step(0.995, avatarEyeOpeningFor(leftUv, eyeIndex));
  float rightWeight = between * step(0.995, avatarEyeOpeningFor(rightUv, eyeIndex));
  float total = leftWeight + rightWeight;
  vec3 sampled = texture2D(eyeReferenceMap, leftUv).rgb * leftWeight
    + texture2D(eyeReferenceMap, rightUv).rgb * rightWeight;
  return total > 0.0 ? sampled / total : fallback;
}

void main() {
  // The head owns the exact visible opening. The deeper globe needs a small
  // overlap underneath the opaque lids so head rotation cannot open a gap.
  // Socket depths are fitted against the head throughout this 14px overlap.
  vec2 globePadding = 14.0 * eyeReferenceTexel;
  vec2 globeHorizontal = avatarEyeLeftRight[eyeIndex];
  vec2 globeVertical = avatarEyeBounds(vEyeReferenceUv.x, eyeIndex);
  if (vEyeReferenceUv.x < globeHorizontal.x - globePadding.x
      || vEyeReferenceUv.x > globeHorizontal.y + globePadding.x
      || vEyeReferenceUv.y < globeVertical.y - globePadding.y
      || vEyeReferenceUv.y > globeVertical.x + globePadding.y) discard;

  vec2 bounds = avatarEyeLeftRight[eyeIndex];
  vec2 verticalBounds = avatarEyeBounds(vEyeReferenceUv.x, eyeIndex);
  float upper = verticalBounds.x;
  float lower = verticalBounds.y;
  float eyeHeight = max(0.00001, upper - lower);
  float vertical = clamp((vEyeReferenceUv.y - lower) / eyeHeight, 0.0, 1.0);
  vec3 surfaceNormal = normalize(vEyePivotNormal);
  vec3 sclera = mix(eyeScleraBottom, eyeScleraTop, smoothstep(0.1, 0.95, vertical));
  float lidShadow = 1.0 - 0.08 * exp(-max(0.0, upper - vEyeReferenceUv.y) / eyeHeight * 12.0);
  float sphereShade = 0.96 + 0.04 * sqrt(max(surfaceNormal.z, 0.0));
  sclera *= lidShadow * sphereShade * eyeTint;
  sclera = avatarScleraFill(vEyeReferenceUv, sclera);
  // Keep the fixed sclera artwork and corner shading. Only the footprint of
  // the old iris needs reconstruction when the independent iris moves away.
  // Reconstruct a softly blended central strip, rather than a circular patch:
  // a circle-shaped transition can leave a false stationary iris outline.
  float oldIrisColumn = abs(vEyeReferenceUv.x - eyeIrisCenter.x) / eyeIrisRadius;
  float originalScleraWeight = smoothstep(1.04, 1.36, oldIrisColumn)
    * step(0.995, avatarEyeOpeningFor(vEyeReferenceUv, eyeIndex));
  sclera = mix(sclera, texture2D(eyeReferenceMap, vEyeReferenceUv).rgb, originalScleraWeight);

  // The photo is sampled only for the iris attached to this rotating globe.
  // Sclera, lids, glasses and skin never participate in a moving image patch.
  vec2 irisOffset = vEyeLocal.xy / eyeProjectionSize;
  vec2 irisPoint = irisOffset / eyeIrisRadius;
  float irisDistance = length(irisPoint);
  float irisMask = (1.0 - smoothstep(0.97, 1.01, irisDistance)) * step(0.0, vEyeLocal.z);
  vec2 sourceUv = eyeIrisCenter + irisOffset;
  vec2 sourceBounds = avatarEyeBounds(sourceUv.x, eyeIndex);
  float sourceEdge = min(sourceBounds.x - sourceUv.y, sourceUv.y - sourceBounds.y);
  float sourceSafe = smoothstep(1.5 * eyeReferenceTexel.y, 4.0 * eyeReferenceTexel.y, sourceEdge);

  // Parts hidden by the original lid have no usable photo pixels. Reconstruct
  // those small portions from safe iris colors instead of sampling the skin.
  float angle = atan(irisPoint.y, irisPoint.x);
  float fibers = 0.96 + 0.07 * sin(angle * 37.0 + irisDistance * 23.0)
    * sin(angle * 13.0 - irisDistance * 31.0);
  vec3 proceduralIris = avatarIrisBrown() * fibers;
  proceduralIris *= 1.0 - 0.6 * smoothstep(0.82, 1.0, irisDistance);
  float pupil = 1.0 - smoothstep(0.49, 0.53, irisDistance);
  proceduralIris = mix(proceduralIris * eyeTint, vec3(0.006), pupil);
  // Complete the hidden upper cap from the visible lower iris at the same
  // radial position. A short blend avoids a horizontal seam through the pupil.
  vec2 mirroredUv = eyeIrisCenter + vec2(irisOffset.x, -abs(irisOffset.y));
  vec2 mirroredBounds = avatarEyeBounds(mirroredUv.x, eyeIndex);
  float mirroredEdge = min(mirroredBounds.x - mirroredUv.y, mirroredUv.y - mirroredBounds.y);
  float mirroredSafe = smoothstep(1.5 * eyeReferenceTexel.y, 4.0 * eyeReferenceTexel.y, mirroredEdge);
  vec3 completeIris = mix(proceduralIris, texture2D(eyeReferenceMap, mirroredUv).rgb, mirroredSafe);
  vec3 iris = mix(completeIris, texture2D(eyeReferenceMap, sourceUv).rgb, sourceSafe);
  vec3 color = mix(sclera, iris, irisMask);

  // A restrained fixed corneal sheen. Existing photographed iris glints are
  // preserved, so no second highlight is added over those source pixels.
  float polish = pow(max(dot(surfaceNormal, normalize(vec3(-0.35, 0.4, 1.0))), 0.0), 45.0);
  color += vec3(0.008) * polish * (1.0 - irisMask * sourceSafe) * (1.0 - originalScleraWeight);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

function finiteArray(value, length) {
  return Array.isArray(value) && value.length === length && value.every(Number.isFinite);
}

function linearColor(value, fallback) {
  const rgb = finiteArray(value, 3) ? value : fallback;
  return new THREE.Color().setRGB(
    THREE.MathUtils.clamp(rgb[0], 0, 255) / 255,
    THREE.MathUtils.clamp(rgb[1], 0, 255) / 255,
    THREE.MathUtils.clamp(rgb[2], 0, 255) / 255,
    THREE.SRGBColorSpace,
  );
}

/**
 * Independent sphere meshes behind openings authored in fixed reference UVs.
 * The parent owns the reference texture and applies EYE_APERTURE_GLSL to the
 * head. setGaze receives already-damped normalized X-right/Y-up coordinates.
 */
export function createAvatarEyes({ parent, referenceTexture, framing, referenceCenter, referenceAspect = 1, eyes } = {}) {
  if (!parent?.isObject3D || !referenceTexture?.isTexture) throw new Error('Avatar eyes require a parent and reference texture.');
  if (!Number.isFinite(framing) || framing <= 0 || !finiteArray(referenceCenter, 2)
    || !Number.isFinite(referenceAspect) || referenceAspect <= 0) throw new Error('Avatar eyes require a valid reference projection.');
  if (!Array.isArray(eyes) || eyes.length > MAX_EYES) throw new Error('Provide up to two calibrated eyes.');
  for (const [index, eye] of eyes.entries()) {
    const aperture = eye?.aperture;
    const points = aperture?.points;
    const validPoints = Array.isArray(points) && points.length >= 2 && points.length <= MAX_APERTURE_POINTS
      && points.every((point, pointIndex) => finiteArray(point, 3) && point[1] >= point[2]
        && (pointIndex === 0 || point[0] > points[pointIndex - 1][0]));
    const validCurves = finiteArray(aperture?.upper, 4) && finiteArray(aperture?.lower, 4);
    if (!finiteArray(eye?.irisCenter, 2) || !Number.isFinite(eye?.irisRadius) || eye.irisRadius <= 0
      || !finiteArray(eye?.position, 3) || !Number.isFinite(eye?.radius) || eye.radius <= 0
      || !Number.isFinite(aperture?.left) || !Number.isFinite(aperture?.right) || aperture.right <= aperture.left
      || (points !== undefined && !validPoints) || (!validPoints && !validCurves)) {
      throw new Error(`Eye ${index + 1} is missing its iris, globe or aperture calibration.`);
    }
  }

  const apertureUniforms = {
    avatarEyeCount: { value: eyes.length },
    avatarEyeRect: { value: Array.from({ length: MAX_EYES }, (_, index) => {
      const aperture = eyes[index]?.aperture;
      if (!aperture) return new THREE.Vector4();
      const lower = aperture.points?.map(point => point[2]) ?? aperture.lower;
      const upper = aperture.points?.map(point => point[1]) ?? aperture.upper;
      return new THREE.Vector4(aperture.left, aperture.right, Math.min(...lower), Math.max(...upper));
    }) },
    avatarEyeLeftRight: { value: Array.from({ length: MAX_EYES }, (_, index) => new THREE.Vector2(eyes[index]?.aperture.left ?? 0, eyes[index]?.aperture.right ?? 1)) },
    avatarEyeUpper: { value: Array.from({ length: MAX_EYES }, (_, index) => new THREE.Vector4(...(eyes[index]?.aperture.upper ?? [0, 0, 0, 0]))) },
    avatarEyeLower: { value: Array.from({ length: MAX_EYES }, (_, index) => new THREE.Vector4(...(eyes[index]?.aperture.lower ?? [0, 0, 0, 0]))) },
    avatarEyePointCount: { value: Array.from({ length: MAX_EYES }, (_, index) => eyes[index]?.aperture.points?.length ?? 0) },
    avatarEyePoints: {
      value: Array.from({ length: MAX_EYES * MAX_APERTURE_POINTS }, (_, index) => {
        const eye = eyes[Math.floor(index / MAX_APERTURE_POINTS)];
        const point = eye?.aperture.points?.[index % MAX_APERTURE_POINTS];
        return new THREE.Vector3(...(point ?? [0, 0, 0]));
      }),
    },
  };
  const group = new THREE.Group();
  group.name = 'avatar-independent-eyes';
  const geometry = new THREE.SphereGeometry(1, 64, 40);
  const globes = [];
  let disposed = false;
  const gaze = new THREE.Vector2();
  const rotation = new THREE.Euler(0, 0, 0, 'YXZ');

  for (const [index, eye] of eyes.entries()) {
    const material = new THREE.ShaderMaterial({
      name: `avatar-eye-${index + 1}`,
      toneMapped: false,
      uniforms: {
        ...apertureUniforms,
        eyeReferenceMap: { value: referenceTexture },
        eyeIndex: { value: index },
        eyeCenter: { value: new THREE.Vector3(...eye.position) },
        eyeRadius: { value: eye.radius },
        eyeQuaternion: { value: new THREE.Vector4(0, 0, 0, 1) },
        eyeProjectionSize: { value: new THREE.Vector2(2 * framing * referenceAspect, 2 * framing) },
        eyeReferenceTexel: {
          value: new THREE.Vector2(
            1 / (referenceTexture.source?.data?.naturalWidth || referenceTexture.source?.data?.width || 1600),
            1 / (referenceTexture.source?.data?.naturalHeight || referenceTexture.source?.data?.height || 1600),
          ),
        },
        eyeReferenceCenter: { value: new THREE.Vector2(...referenceCenter) },
        eyeIrisCenter: { value: new THREE.Vector2(...eye.irisCenter) },
        eyeIrisRadius: { value: eye.irisRadius },
        eyeScleraTop: { value: linearColor(eye.scleraTop, [155, 145, 130]) },
        eyeScleraBottom: { value: linearColor(eye.scleraBottom, [213, 205, 190]) },
        eyeTint: { value: linearColor(eye.tint, [255, 255, 255]) },
        eyeFallbackBrown: { value: linearColor(null, [84, 49, 30]) },
      },
      vertexShader: EYE_VERTEX_SHADER,
      fragmentShader: EYE_FRAGMENT_SHADER,
    });
    const globe = new THREE.Mesh(geometry, material);
    globe.name = `avatar-eyeball-${index + 1}`;
    globe.position.fromArray(eye.position);
    globe.scale.setScalar(eye.radius);
    group.add(globe);
    globes.push(globe);
  }
  parent.add(group);

  return {
    apertureUniforms,
    setGaze(x = 0, y = 0) {
      if (disposed) return;
      gaze.set(Number.isFinite(x) ? THREE.MathUtils.clamp(x, -1, 1) : 0, Number.isFinite(y) ? THREE.MathUtils.clamp(y, -1, 1) : 0);
      rotation.set(-gaze.y * MAX_PITCH, gaze.x * MAX_YAW, 0, 'YXZ');
      for (const globe of globes) {
        globe.quaternion.setFromEuler(rotation);
        globe.material.uniforms.eyeQuaternion.value.set(globe.quaternion.x, globe.quaternion.y, globe.quaternion.z, globe.quaternion.w);
      }
    },
    getMetrics() {
      return {
        disposed,
        eyeballs: disposed ? 0 : globes.length,
        triangles: disposed ? 0 : geometry.index.count / 3 * globes.length,
        gaze: gaze.toArray(),
        yawDegrees: gaze.x * 12,
        pitchDegrees: gaze.y * 6,
        type: 'independent-sphere-meshes',
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      gaze.set(0, 0);
      apertureUniforms.avatarEyeCount.value = 0;
      group.removeFromParent();
      for (const globe of globes) globe.material.dispose();
      group.clear();
      geometry.dispose();
    },
  };
}
