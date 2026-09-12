// Keep the visible character alive until its replacement has drawn a frame.
// DOM and renderer work stay in the caller; this owns cancellation and cleanup.
export function createAvatarHandoff({createEntry, mountEntry, revealEntry, showFallback, removeEntry, onCommit, transitionMs = () => 180}) {
  let current = null
  let pending = null
  const outgoing = new Map()

  function release(entry) {
    if (!entry || entry.disposed) return
    entry.disposed = true
    entry.abort.abort()
    entry.controller?.dispose()
    removeEntry(entry)
  }

  function clearOutgoing() {
    for (const [entry, timer] of outgoing) {
      clearTimeout(timer)
      release(entry)
    }
    outgoing.clear()
  }

  function commit(entry) {
    if (pending !== entry || entry.disposed) return
    const previous = current
    current = entry
    pending = null
    revealEntry(entry, previous)
    onCommit?.(entry.slug)
    if (!previous) return
    previous.controller?.setActive(false)
    const delay = transitionMs()
    if (!delay) release(previous)
    else outgoing.set(previous, setTimeout(() => {
      outgoing.delete(previous)
      release(previous)
    }, delay))
  }

  function fail(entry, error) {
    if (entry.disposed || entry.failed || (entry !== pending && entry !== current)) return
    entry.failed = true
    entry.abort.abort()
    entry.controller?.dispose()
    showFallback(entry, error)
    // Runtime context loss also restores the current character's artwork.
    if (entry === pending) commit(entry)
  }

  function select(slug) {
    if (pending?.slug === slug) return
    release(pending)
    pending = null
    clearOutgoing()
    if (current?.slug === slug) {
      onCommit?.(slug)
      return
    }
    const entry = {
      ...createEntry(slug, Boolean(current)), slug,
      abort: new AbortController(), controller: null, disposed: false, failed: false,
    }
    pending = entry
    if (!entry.enabled) {
      commit(entry)
      return
    }
    // Promise resolution only means assets loaded. Reveal waits for onReady,
    // including when rendering is paused by a hidden tab or a non-landing route.
    Promise.resolve().then(() => {
      if (entry.disposed) return null
      return mountEntry(entry, {
        signal: entry.abort.signal,
        onReady(controller) {
          if (entry.disposed || entry.failed) return
          entry.controller = controller
          commit(entry)
        },
        onError(error) { fail(entry, error) },
      })
    }).then(controller => {
      if (!controller) return
      if (entry.disposed || entry.failed) controller.dispose()
      else entry.controller = controller
    }).catch(error => {
      if (error.name !== 'AbortError') fail(entry, error)
    })
  }

  return {
    select,
    dispose() {
      release(pending)
      release(current)
      pending = current = null
      clearOutgoing()
    },
  }
}
