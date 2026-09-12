import {AVATAR_EYES} from './avatar-eye-config.js'

// One reviewed configuration for both the homepage and the comparison view.
// Real GLB geometry with the original front artwork used as a surface reference.
export const ORIGINALS_AVATAR = {
  label: 'Originals',
  modelUrl: '/models/originals-v1.glb',
  rotationY: -Math.PI / 2,
  framing: 1600 / 1447,
  cameraOffsetY: -2 * (1600 / 1447) * (0.5153125 - 0.5),
  scaleX: 0.7498272287491361 / (0.7522892653942108 / 0.9809410870075226),
  lighting: 'studio',
  exposure: 1,
  environmentIntensity: 0.7,
  keyIntensity: 2,
  referenceTextureUrl: '/avatars/originals@2x.webp',
  referenceFraming: 1600 / 1447,
  referenceCenter: [0.5003125, 0.5153125],
  referenceStrength: 0.98,
  eyes: AVATAR_EYES.originals,
}

function variant(id, label, {framing, center, aspect}, modelAspect) {
  return {
    ...ORIGINALS_AVATAR,
    label,
    modelUrl: `/models/${id}-v1.glb`,
    referenceTextureUrl: `/avatars/${id}@2x.webp`,
    framing,
    referenceFraming: framing,
    referenceCenter: center,
    cameraOffsetY: -2 * framing * (center[1] - 0.5),
    scaleX: aspect / modelAspect,
    eyes: AVATAR_EYES[id],
    pencil: id === 'bubble',
  }
}

// Each extracted head is framed against its own original transparent artwork.
export const AVATAR_MODELS = {
  originals: ORIGINALS_AVATAR,
  bubble: variant('bubble', 'Bubble', {
    framing: 1600 / 1430, center: [0.5, 0.510625], aspect: 1084 / 1430,
  }, 0.7569592307892801),
  music: variant('music', 'Plus', {
    framing: 1600 / 1452, center: [0.5, 0.516875], aspect: 1264 / 1452,
  }, 0.8482024138195416),
  vision: variant('vision', 'Vision', {
    framing: 1600 / 1476, center: [0.5, 0.524375], aspect: 1084 / 1476,
  }, 0.7178855154107124),
}
