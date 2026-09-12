// Gaze uses the avatar as its neutral point and the viewport edges as its bounds.
// Head rotation continues to use the original, local hover area.
export function viewportGaze(point, rect, viewport) {
  const cx = Math.max(0, Math.min(viewport.width, rect.left + rect.width / 2))
  const cy = Math.max(0, Math.min(viewport.height, rect.top + rect.height / 2))
  const axis = (value, center, extent) => Math.max(-1, Math.min(1,
    (value - center) / Math.max(1, value < center ? center : extent - center)))
  return [axis(point.clientX, cx, viewport.width), -axis(point.clientY, cy, viewport.height)]
}

export function bindViewportGaze({target = window, root = document, getRect, enabled, onGaze, onReset}) {
  const move = event => {
    if (event.pointerType === 'touch') { onReset(); return }
    if (!enabled()) return
    const rect = getRect()
    if (!rect.width || !rect.height) return
    onGaze(...viewportGaze(event, rect, {width: target.innerWidth, height: target.innerHeight}))
  }
  const leave = event => { if (!event.relatedTarget) onReset() }
  target.addEventListener('pointermove', move, {passive: true, capture: true})
  target.addEventListener('blur', onReset)
  root.addEventListener('pointerleave', leave)
  target.addEventListener('pointercancel', onReset)
  return () => {
    target.removeEventListener('pointermove', move, {capture: true})
    target.removeEventListener('blur', onReset)
    root.removeEventListener('pointerleave', leave)
    target.removeEventListener('pointercancel', onReset)
  }
}
