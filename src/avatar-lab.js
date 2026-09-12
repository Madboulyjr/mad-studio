import {mountAvatar3D} from './avatar-3d.js'
import {AVATAR_MODELS} from './avatar-config.js'

const status = document.querySelector('#status')
const metrics = document.querySelector('#metrics')
const stage = document.querySelector('#model-stage')
const poster = document.querySelector('#model-poster')
const reference = document.querySelector('#reference-image')
const controls = [...document.querySelectorAll('[data-yaw], [data-motion]')]
let abort
let avatar
let selection = new URLSearchParams(location.search).get('avatar')
if (!Object.hasOwn(AVATAR_MODELS, selection)) selection = 'originals'

const picker = document.querySelector('#avatar-picker')
for (const [slug, config] of Object.entries(AVATAR_MODELS)) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.avatar = slug
  button.textContent = config.label
  button.setAttribute('aria-pressed', String(slug === selection))
  button.addEventListener('click', () => selectAvatar(slug))
  picker.append(button)
}

async function selectAvatar(slug) {
  abort?.abort()
  avatar?.dispose()
  avatar = null
  delete stage.dataset.model
  const request = new AbortController()
  abort = request
  selection = slug
  const config = AVATAR_MODELS[slug]
  reference.src = config.referenceTextureUrl
  poster.src = config.referenceTextureUrl
  reference.alt = `Original ${config.label} avatar`
  poster.alt = `${config.label} 3D study, with original artwork shown while loading`
  document.querySelector('h1').textContent = `${config.label}. In 3D.`
  document.title = `${config.label} — 3D review`
  document.querySelectorAll('[data-avatar]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.avatar === slug)))
  controls.forEach(button => {
    button.disabled = true
    button.setAttribute('aria-pressed', String(button.dataset.motion === 'live'))
  })
  status.textContent = 'Loading the model. The original stays visible until it is ready.'
  metrics.textContent = ''
  history.replaceState(null, '', `${location.pathname}?avatar=${slug}`)
  let failed = false
  const showFallback = error => {
    if (request.signal.aborted || failed) return
    failed = true
    avatar = null
    delete stage.dataset.model
    controls.forEach(button => { button.disabled = true })
    metrics.textContent = ''
    status.textContent = 'The model could not load. The original image is still available; select a character to retry.'
    console.warn('Avatar review unavailable.', error)
  }
  try {
    const model = await mountAvatar3D({...config, container:stage, poster, signal:request.signal, onReady:controller => {
      if (request.signal.aborted) return
      const info = controller.getMetrics()
      metrics.textContent = `${info.modelTriangles.toLocaleString()} head triangles · ${info.gaze.rig?.eyeballs || 0} independent 3D eyes`
      stage.dataset.model = slug
      controls.forEach(button => { button.disabled = button.dataset.motion === 'eyes' && !controller.setMotionMode })
    }, onError:showFallback})
    if (request.signal.aborted) { model.dispose(); return }
    avatar = model
    avatar.setZoom(document.querySelector('.comparison').classList.contains('eye-detail') ? 2.6 : 1)
    if (avatar.setMotionMode) avatar.setMotionMode('live')
    else avatar.setRotation(null)
    status.textContent = 'Move your pointer over the model. Choose Eyes only to see the gaze without head movement.'
  } catch (error) {
    if (request.signal.aborted) return
    showFallback(error)
  }
}

document.querySelectorAll('[data-yaw]').forEach(button => button.addEventListener('click', () => {
  avatar?.setRotation({yaw:Number(button.dataset.yaw) * Math.PI / 180, pitch:0})
  controls.forEach(other => other.setAttribute('aria-pressed', String(other === button)))
  status.textContent = `${button.textContent} view locked. Choose Live movement or Eyes only to try the animation.`
}))
document.querySelectorAll('[data-motion]').forEach(control => control.addEventListener('click', event => {
  if (avatar?.setMotionMode) avatar.setMotionMode(event.currentTarget.dataset.motion)
  else avatar?.setRotation(null)
  controls.forEach(button => button.setAttribute('aria-pressed', String(button === event.currentTarget)))
  status.textContent = event.currentTarget.dataset.motion === 'eyes'
    ? 'Head and eyelids held still. Move your pointer over the face: the eyeballs turn inside the lids.'
    : 'Eyes lead the gaze, with a small head turn and a soft spring in the hair or headwear.'
}))
window.addEventListener('pagehide', () => { abort?.abort(); avatar?.dispose() })
window.addEventListener('pageshow', event => { if (event.persisted) selectAvatar(selection) })
document.querySelector('#eye-detail').addEventListener('click', event => {
  const enabled = document.querySelector('.comparison').classList.toggle('eye-detail')
  avatar?.setZoom(enabled ? 2.6 : 1)
  event.currentTarget.setAttribute('aria-pressed', String(enabled))
  event.currentTarget.textContent = enabled ? 'Show full character' : 'Eye close-up'
})
await selectAvatar(selection)
