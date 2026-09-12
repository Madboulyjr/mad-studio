import test from 'node:test'
import assert from 'node:assert/strict'
import {createAvatarHandoff} from '../src/avatar-handoff.js'

const flush = () => new Promise(resolve => setImmediate(resolve))

function harness(options = {}) {
  const entries = []
  const commits = []
  let visible = null
  const handoff = createAvatarHandoff({
    createEntry(slug, hasCurrent) {
      const entry = {slug, hasCurrent, enabled: !options.disabled, removed: false, fallback: false}
      entries.push(entry)
      return entry
    },
    mountEntry(entry, callbacks) {
      const record = entries.findLast(item => item.slug === entry.slug)
      record.signal = callbacks.signal
      record.controller = {
        disposed: false, active: true,
        dispose() { this.disposed = true },
        setActive(active) { this.active = active },
      }
      record.ready = () => callbacks.onReady(record.controller)
      record.fail = error => callbacks.onError(error)
      return new Promise((resolve, reject) => {
        record.loaded = () => resolve(record.controller)
        record.reject = reject
      })
    },
    revealEntry(entry) { visible = entry.slug },
    showFallback(entry) { entries.findLast(item => item.slug === entry.slug).fallback = true },
    removeEntry(entry) { entries.findLast(item => item.slug === entry.slug).removed = true },
    onCommit(slug) { commits.push(slug) },
    transitionMs: () => options.duration ?? 180,
  })
  return {...handoff, entries, commits, visible: () => visible}
}

test('asset completion does not reveal a character before its first rendered frame', async () => {
  const h = harness()
  h.select('originals')
  await flush()
  const first = h.entries[0]
  first.loaded()
  await flush()
  assert.equal(h.visible(), null)
  assert.equal(first.fallback, false)
  // A hidden page can remain in this loaded state until rendering resumes.
  first.ready()
  assert.equal(h.visible(), 'originals')
  assert.deepEqual(h.commits, ['originals'])
  h.dispose()
})

test('keeps current 3D until replacement is ready, then releases it after the fade', async t => {
  t.mock.timers.enable({apis: ['setTimeout']})
  const h = harness()
  h.select('originals')
  await flush()
  const first = h.entries[0]
  first.loaded()
  first.ready()
  h.select('bubble')
  await flush()
  const second = h.entries[1]
  second.loaded()
  await flush()
  assert.equal(h.visible(), 'originals')
  assert.equal(first.controller.disposed, false)
  assert.equal(first.controller.active, true)
  assert.equal(second.fallback, false)
  second.ready()
  assert.equal(h.visible(), 'bubble')
  assert.equal(first.controller.active, false)
  assert.equal(first.removed, false)
  t.mock.timers.tick(179)
  assert.equal(first.removed, false)
  t.mock.timers.tick(1)
  assert.equal(first.controller.disposed, true)
  assert.equal(first.removed, true)
  h.dispose()
})

test('rapid selection cancels only the pending character and ignores its late callbacks', async () => {
  const h = harness({duration: 0})
  h.select('originals')
  await flush()
  const first = h.entries[0]
  first.loaded()
  first.ready()
  h.select('bubble')
  await flush()
  const stale = h.entries[1]
  h.select('vision')
  await flush()
  const latest = h.entries[2]
  assert.equal(stale.signal.aborted, true)
  assert.equal(stale.removed, true)
  assert.equal(first.controller.disposed, false)
  stale.loaded()
  stale.ready()
  stale.fail(new Error('late error'))
  await flush()
  assert.equal(stale.controller.disposed, true)
  assert.equal(h.visible(), 'originals')
  assert.equal(stale.fallback, false)
  latest.loaded()
  latest.ready()
  assert.equal(h.visible(), 'vision')
  assert.deepEqual(h.commits, ['originals', 'vision'])
  h.dispose()
})

test('returning to current section during load reuses its live renderer', async () => {
  const h = harness()
  h.select('originals')
  await flush()
  h.entries[0].loaded()
  h.entries[0].ready()
  h.select('bubble')
  await flush()
  h.select('originals')
  assert.equal(h.entries.length, 2)
  assert.equal(h.entries[1].signal.aborted, true)
  assert.equal(h.entries[0].controller.disposed, false)
  assert.equal(h.visible(), 'originals')
  h.dispose()
})

test('initial load failure and runtime context loss expose fallback without another handoff', async () => {
  const h = harness({duration: 0})
  h.select('originals')
  await flush()
  h.entries[0].reject(new Error('GLB failed'))
  await flush()
  assert.equal(h.visible(), 'originals')
  assert.equal(h.entries[0].fallback, true)
  h.select('bubble')
  await flush()
  const second = h.entries[1]
  second.loaded()
  second.ready()
  second.fail(new Error('WebGL context lost'))
  assert.equal(h.visible(), 'bubble')
  assert.equal(second.fallback, true)
  assert.equal(second.controller.disposed, true)
  assert.deepEqual(h.commits, ['originals', 'bubble'])
  h.dispose()
})

test('3D override off commits artwork immediately without loading a renderer', () => {
  const h = harness({disabled: true, duration: 0})
  h.select('originals')
  h.select('bubble')
  assert.equal(h.visible(), 'bubble')
  assert.equal(h.entries[0].removed, true)
  assert.ok(h.entries.every(entry => !entry.controller))
  h.dispose()
})

test('new selection and disposal clear outgoing timers and all renderer ownership', async t => {
  t.mock.timers.enable({apis: ['setTimeout']})
  const h = harness()
  for (const slug of ['originals', 'bubble']) {
    h.select(slug)
    await flush()
    h.entries.at(-1).loaded()
    h.entries.at(-1).ready()
  }
  h.select('vision')
  await flush()
  assert.equal(h.entries[0].removed, true)
  h.dispose()
  h.entries.at(-1).loaded()
  await flush()
  t.mock.timers.tick(1000)
  assert.ok(h.entries.every(entry => entry.removed && entry.controller.disposed))
  assert.deepEqual(h.commits, ['originals', 'bubble'])
})
