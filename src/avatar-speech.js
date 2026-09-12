// Original 1600px artwork alpha bounds (alpha >= 32), including accessories.
// Keeping these tied to the canvas avoids positioning against its transparent margins.
const ART_BOUNDS = {
  originals: [257, 51, 1343, 1499],
  bubble: [258, 67, 1343, 1499],
  music: [167, 47, 1433, 1499],
  vision: [258, 22, 1343, 1499],
}

export const SPEECH_PHRASES = {
  originals: [
    ['Ctrl + Z is self-care.', 'Undo. Breathe.'],
    ['Make it pop? Define pop.', 'Define pop.'],
    ['Big idea. Tiny details.', 'Idea first.'],
    ['Art direction. Gut feeling.', 'Trust taste.'],
    ['One last tweak. Again.', 'One last tweak.'],
    ['Less noise. More nerve.', 'More nerve.'],
    ['The brief needs a plot twist.', 'Plot twist?'],
    ['Good taste. Bad sleep.', 'Taste > sleep.'],
  ],
  bubble: [
    ['Trust the madness.', 'Stay mad.'],
    ['Off brief. On purpose.', 'Off brief.'],
    ['Pixels with personality.', 'Pixel party.'],
    ['Kerning my way through life.', 'Kern it.'],
    ['This layer has feelings.', 'Layers feel.'],
    ['A little weird looks good.', 'Weird works.'],
    ['No rules. Great colours.', 'No rules.'],
    ['Final. FINAL. Final.psd.', 'Final. Again.'],
  ],
  music: [
    ['One more loop. Then sleep.', 'One more loop.'],
    ['Bass is a design decision.', 'Bass first.'],
    ['Less talk. More groove.', 'More groove.'],
    ['Good things take rhythm.', 'Find the beat.'],
    ['A little oud. A lot of mood.', 'Oud mood.'],
    ['The kick has entered the chat.', 'Kick it.'],
    ['Headphones on. World off.', 'Press play.'],
    ['That drop needed a plot twist.', 'Drop a twist.'],
  ],
  vision: [
    ['Fix it in pre-production.', 'Plan the shot.'],
    ['Plot twist: one more take.', 'One more take.'],
    ['Light does the talking.', 'Light talks.'],
    ['Every frame earns its place.', 'Frame by frame.'],
    ['Concept first. Camera second.', 'Idea. Camera.'],
    ['Cut the scene. Keep the feeling.', 'Keep the feel.'],
    ['A little cinema. A little chaos.', 'Cinema chaos.'],
    ['Rolling. Overthinking. Rolling.', 'Still rolling.'],
  ],
}

const right = rect => rect.x + rect.width
const bottom = rect => rect.y + rect.height
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const rectOf = rect => ({x: rect.left ?? rect.x, y: rect.top ?? rect.y, width: rect.width, height: rect.height})
const validRect = rect => rect && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) && rect.width > 0 && rect.height > 0

export function intersectionArea(a, b) {
  return Math.max(0, Math.min(right(a), right(b)) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y))
}

function intersectionRect(a, b) {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  return {x, y, width: Math.min(right(a), right(b)) - x, height: Math.min(bottom(a), bottom(b)) - y}
}

function expand(rect, padding) {
  return {x: rect.x - padding, y: rect.y - padding, width: rect.width + padding * 2, height: rect.height + padding * 2}
}

export function avatarSpeechBounds(canvas, slug) {
  const art = ART_BOUNDS[slug]
  if (!art || !validRect(canvas)) return null
  // The orthographic camera fits image height; non-square canvas sides are padding.
  const unit = canvas.height / 1600
  const x = canvas.x + (canvas.width - canvas.height) / 2
  const bounds = {x: x + art[0] * unit, y: canvas.y + art[1] * unit,
    width: (art[2] - art[0]) * unit, height: (art[3] - art[1]) * unit}
  // Covers the complete small hover rotation and accessory sway envelope.
  return expand(bounds, Math.max(3, canvas.height * 0.02))
}

// All inputs and results use viewport CSS pixels. Return null instead of putting
// a bubble across the face when the available space cannot satisfy the limit.
export function placeSpeechBubble({avatar, bubble, bounds, obstacles = [], preferredIndex = 0, maxOverlap = 0.05}) {
  if (!validRect(avatar) || !validRect(bounds) || !bubble || !(bubble.width > 0 && bubble.height > 0)
    || bubble.width > bounds.width || bubble.height > bounds.height) return null
  const {width, height} = bubble
  const overlapInset = width * 0.025
  const left = avatar.x - width + overlapInset
  const nearRight = right(avatar) - overlapInset
  const upper = avatar.y + avatar.height * 0.14 - height / 2
  const lower = avatar.y + avatar.height * 0.82 - height / 2
  const sides = [
    {x: left, y: upper, position: 'side-left-upper'},
    {x: nearRight, y: lower, position: 'side-right-lower'},
    {x: nearRight, y: upper, position: 'side-right-upper'},
    {x: left, y: lower, position: 'side-left-lower'},
  ]
  const index = ((preferredIndex % sides.length) + sides.length) % sides.length
  const candidates = [...sides.slice(index), ...sides.slice(0, index)]
  // Above/below is preferable to squeezing between a cheek and the viewport edge.
  for (const fraction of [0.2, 0.8, 0.5]) {
    const x = avatar.x + avatar.width * fraction - width / 2
    candidates.push({x, y: avatar.y - height - 5, position: 'above'},
      {x, y: bottom(avatar) + 5, position: 'below'})
  }
  const eyeBand = {x: avatar.x, y: avatar.y + avatar.height * 0.37,
    width: avatar.width, height: avatar.height * 0.31}
  for (const candidate of candidates) {
    const placed = {x: clamp(candidate.x, bounds.x, right(bounds) - width),
      y: clamp(candidate.y, bounds.y, bottom(bounds) - height), width, height}
    const overlap = intersectionArea(placed, avatar) / (width * height)
    if (overlap > maxOverlap + 1e-9 || intersectionArea(placed, eyeBand) > 0
      || obstacles.some(obstacle => intersectionArea(placed, obstacle) > 0)) continue
    return {...placed, position: candidate.position, overlap}
  }
  return null
}

let active = null
const phraseCursors = new Map()

export function stopSpeechRotation() {
  if (!active) return
  const previous = active
  active = null
  clearTimeout(previous.timer)
  clearTimeout(previous.fadeTimer)
  cancelAnimationFrame(previous.frame)
  previous.observer?.disconnect()
  previous.routeObserver?.disconnect()
  window.removeEventListener('resize', previous.queuePlacement)
  document.removeEventListener('visibilitychange', previous.onVisibility)
  previous.bubble.classList.remove('show')
  previous.bubble.style.visibility = 'hidden'
}

export function startSpeechRotation(slug) {
  stopSpeechRotation()
  const bubble = document.getElementById('speech-bubble')
  const stage = document.getElementById('illustration')
  const text = bubble?.querySelector('.speech-text')
  const phrases = SPEECH_PHRASES[slug]
  if (!bubble || !stage || !text || !phrases) return
  const state = {bubble, timer: null, fadeTimer: null, frame: null, observer: null, routeObserver: null,
    index: phraseCursors.get(slug) || 0, phrase: null, queuePlacement: null, onVisibility: null}
  active = state
  const current = () => active === state && bubble.isConnected && stage.isConnected
  const onLanding = () => !document.hidden && (!document.body.dataset.route || document.body.dataset.route === 'landing')

  function position() {
    state.frame = null
    if (!current() || !state.phrase || !onLanding()) return
    const float = [...stage.querySelectorAll('.avatar-float')].find(element =>
      !element.classList.contains('avatar-stage-pending') && !element.classList.contains('avatar-stage-outgoing')
      && (!element.dataset.avatar || element.dataset.avatar === slug))
    const canvas = float?.querySelector('.avatar-3d-canvas')
    const surface = canvas || (float?.classList.contains('avatar-3d-primary') ? null : float?.querySelector('.avatar3d'))
    const parent = bubble.offsetParent
    if (!surface || !parent) return
    const avatar = avatarSpeechBounds(rectOf(surface.getBoundingClientRect()), slug)
    if (!avatar) return
    const viewport = {x: 10, y: 10, width: document.documentElement.clientWidth - 20, height: window.innerHeight - 20}
    const hero = stage.closest('.hero')
    const heroBounds = hero ? intersectionRect(viewport, rectOf(hero.getBoundingClientRect())) : viewport
    const stageBounds = intersectionRect(heroBounds, rectOf(stage.getBoundingClientRect()))
    const obstacles = [...document.querySelectorAll('.hero-copy,.home-contact,.home-featured,#enter-pill,.bottomnav')]
      .filter(element => !element.hidden && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
      .map(element => expand(rectOf(element.getBoundingClientRect()), 6))
    const parentRect = parent.getBoundingClientRect()
    const scaleX = parent.offsetWidth ? parentRect.width / parent.offsetWidth : 1
    const scaleY = parent.offsetHeight ? parentRect.height / parent.offsetHeight : 1
    const widths = window.innerWidth <= 768 ? [128, 112, 96, 84, 76] : [176, 144, 112, 96, 84]
    let placed = null
    bubble.style.display = ''
    bubble.style.visibility = 'hidden'
    for (const allowed of [stageBounds, heroBounds]) {
      for (const width of widths) {
        bubble.style.setProperty('--speech-max-width', `${width}px`)
        text.textContent = state.phrase[width <= 96 ? 1 : 0]
        const measured = bubble.getBoundingClientRect()
        placed = placeSpeechBubble({avatar, bubble: {width: measured.width, height: measured.height},
          bounds: allowed, obstacles, preferredIndex: state.index})
        if (placed) break
      }
      if (placed) break
    }
    if (!placed) {
      bubble.classList.remove('show')
      return
    }
    bubble.style.left = `${(placed.x - parentRect.left) / scaleX - parent.clientLeft + parent.scrollLeft}px`
    bubble.style.top = `${(placed.y - parentRect.top) / scaleY - parent.clientTop + parent.scrollTop}px`
    bubble.style.right = 'auto'
    bubble.style.bottom = 'auto'
    bubble.dataset.pos = placed.position
    bubble.dataset.overlap = placed.overlap.toFixed(4)
    bubble.style.visibility = ''
    bubble.classList.add('show')
  }

  state.queuePlacement = () => {
    if (!current()) return
    cancelAnimationFrame(state.frame)
    state.frame = requestAnimationFrame(position)
  }
  function nextPhrase() {
    clearTimeout(state.timer)
    clearTimeout(state.fadeTimer)
    if (!current() || !onLanding()) return
    bubble.classList.remove('show')
    state.fadeTimer = setTimeout(() => {
      if (!current() || !onLanding()) return
      state.phrase = phrases[state.index % phrases.length]
      phraseCursors.set(slug, ++state.index)
      state.queuePlacement()
      state.timer = setTimeout(nextPhrase, 4500)
    }, state.phrase ? 220 : 0)
  }
  state.onVisibility = () => {
    clearTimeout(state.timer)
    clearTimeout(state.fadeTimer)
    if (onLanding()) nextPhrase()
    else bubble.classList.remove('show')
  }
  window.addEventListener('resize', state.queuePlacement)
  document.addEventListener('visibilitychange', state.onVisibility)
  // SPA navigation does not produce a visibilitychange when the hero returns.
  // Resume the rotation explicitly after returning from work/contact pages.
  if (typeof MutationObserver !== 'undefined') {
    state.routeObserver = new MutationObserver(state.onVisibility)
    state.routeObserver.observe(document.body, {attributes: true, attributeFilter: ['data-route']})
  }
  if (typeof ResizeObserver !== 'undefined') {
    state.observer = new ResizeObserver(state.queuePlacement)
    for (const element of [stage, stage.closest('.hero'), ...stage.querySelectorAll('.avatar-float')]) {
      if (element) state.observer.observe(element)
    }
  }
  document.fonts?.ready.then(() => { if (current()) state.queuePlacement() })
  bubble.style.visibility = 'hidden'
  nextPhrase()
}
