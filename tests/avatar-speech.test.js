import test from 'node:test'
import assert from 'node:assert/strict'
import {avatarSpeechBounds, intersectionArea, placeSpeechBubble, SPEECH_PHRASES, startSpeechRotation, stopSpeechRotation} from '../src/avatar-speech.js'

function assertPlacement(result, avatar, bounds, obstacles = []) {
  assert.ok(result, 'the bubble must find usable space')
  assert.ok(result.x >= bounds.x && result.y >= bounds.y)
  assert.ok(result.x + result.width <= bounds.x + bounds.width + 1e-8)
  assert.ok(result.y + result.height <= bounds.y + bounds.height + 1e-8)
  assert.ok(intersectionArea(result, avatar) / (result.width * result.height) <= 0.05 + 1e-8)
  for (const obstacle of obstacles) assert.equal(intersectionArea(result, obstacle), 0)
}

test('every character stays within the overlap limit at desktop and narrow mobile sizes', () => {
  for (const [width, height, canvasSize] of [[1440, 900, 480], [768, 900, 320], [375, 812, 244], [320, 568, 136]]) {
    const bounds = {x: 10, y: 140, width: width - 20, height: height - 320}
    const canvas = {x: (width - canvasSize) / 2, y: 155, width: canvasSize, height: canvasSize}
    for (const slug of Object.keys(SPEECH_PHRASES)) {
      const avatar = avatarSpeechBounds(canvas, slug)
      for (let preferredIndex = 0; preferredIndex < 4; preferredIndex++) {
        const result = placeSpeechBubble({avatar, bounds, bubble: {width: width < 768 ? 84 : 150, height: 44}, preferredIndex})
        assertPlacement(result, avatar, bounds)
      }
    }
  }
})

test('clamping at a narrow screen edge never pushes a bubble across the face', () => {
  const bounds = {x: 10, y: 20, width: 300, height: 480}
  const avatar = {x: 45, y: 150, width: 230, height: 210}
  const result = placeSpeechBubble({avatar, bounds, bubble: {width: 130, height: 46}})
  assertPlacement(result, avatar, bounds)
  assert.ok(['above', 'below'].includes(result.position))
})

test('speech avoids headline, contact and navigation even outside the illustration', () => {
  const bounds = {x: 10, y: 20, width: 355, height: 680}
  const avatar = {x: 65, y: 230, width: 245, height: 270}
  const obstacles = [
    {x: 20, y: 100, width: 335, height: 80},
    {x: 220, y: 20, width: 140, height: 44},
    {x: 20, y: 600, width: 335, height: 90},
  ]
  const result = placeSpeechBubble({avatar, bounds, obstacles, bubble: {width: 128, height: 42}})
  assertPlacement(result, avatar, bounds, obstacles)
})

test('a packed viewport returns no placement instead of violating the overlap requirement', () => {
  const bounds = {x: 0, y: 0, width: 320, height: 220}
  assert.equal(placeSpeechBubble({avatar: bounds, bounds, bubble: {width: 84, height: 44}}), null)
})

test('avatar bounds follow the rendered canvas including non-square letterboxing and hover margin', () => {
  const square = avatarSpeechBounds({x: 0, y: 0, width: 400, height: 400}, 'bubble')
  const wide = avatarSpeechBounds({x: 0, y: 0, width: 600, height: 400}, 'bubble')
  assert.equal(wide.x, square.x + 100)
  assert.equal(wide.width, square.width)
  assert.equal(wide.y, square.y)
  assert.ok(square.x < 258 / 4)
  assert.ok(square.y < 67 / 4)
  assert.ok(avatarSpeechBounds({x: 0, y: 0, width: 400, height: 400}, 'music').width > square.width)
})

test('each section has distinct full and compact copy suitable for small bubbles', () => {
  for (const phrases of Object.values(SPEECH_PHRASES)) {
    assert.equal(phrases.length, 8)
    assert.equal(new Set(phrases.map(([full]) => full)).size, 8)
    for (const [full, compact] of phrases) {
      assert.ok(full.length <= 36)
      assert.ok(compact.length <= 16)
      assert.ok(compact.length <= full.length)
    }
  }
})

test('navigation pauses and resumes speech, and cleanup cancels every deferred update', () => {
  const keys = ['document', 'window', 'MutationObserver', 'ResizeObserver', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame']
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const timers = new Map()
  const frames = new Map()
  const listeners = new Set()
  let nextId = 0
  let routeObserver
  const text = {}
  const bubble = {isConnected: true, style: {}, classList: {remove() {}}, querySelector: () => text}
  const stage = {isConnected: true, closest: () => null, querySelectorAll: () => []}
  const document = {hidden: false, body: {dataset: {route: 'landing'}},
    getElementById: id => id === 'speech-bubble' ? bubble : stage,
    addEventListener: (_, handler) => listeners.add(handler), removeEventListener: (_, handler) => listeners.delete(handler)}
  try {
    Object.assign(globalThis, {document,
      window: {addEventListener: (_, handler) => listeners.add(handler), removeEventListener: (_, handler) => listeners.delete(handler)},
      ResizeObserver: undefined,
      MutationObserver: class {
        constructor(callback) { this.callback = callback; routeObserver = this }
        observe(_, options) { assert.deepEqual(options.attributeFilter, ['data-route']) }
        disconnect() { this.disconnected = true }
      },
      setTimeout: callback => { timers.set(++nextId, callback); return nextId },
      clearTimeout: id => timers.delete(id),
      requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId },
      cancelAnimationFrame: id => frames.delete(id),
    })
    const runNextTimer = () => {
      const [id, callback] = timers.entries().next().value
      timers.delete(id)
      callback()
    }
    startSpeechRotation('bubble')
    runNextTimer()
    assert.equal(timers.size, 1, 'the next phrase is scheduled')
    document.body.dataset.route = 'detail'
    routeObserver.callback()
    assert.equal(timers.size, 0, 'no phrase advances behind a detail page')
    document.body.dataset.route = 'landing'
    routeObserver.callback()
    assert.equal(timers.size, 1, 'returning to the hero resumes without a visibility event')
    runNextTimer()
    assert.equal(frames.size, 1, 'a fresh measurement is queued for the visible hero')
    stopSpeechRotation()
    assert.equal(timers.size, 0)
    assert.equal(frames.size, 0)
    assert.equal(listeners.size, 0)
    assert.ok(routeObserver.disconnected)
  } finally {
    stopSpeechRotation()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
