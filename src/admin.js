/**
 * Inline admin editor — runs at /admin on beingmad.co.
 * Lazy-loaded by main.js so it doesn't bloat the public bundle.
 *
 * Flow:
 *   1. Mount UI shell into document.body (#admin-root)
 *   2. Check auth state via /api/admin/me
 *   3. Render either: login form OR dashboard
 *   4. Dashboard: list of sections + projects, click → edit form
 *   5. Edit form: PATCH /api/admin/(projects|sections)?id=X
 *   6. Save → success toast → re-fetch list
 */

const API = {
  me: '/api/admin/me',
  login: '/api/admin/login',
  logout: '/api/admin/logout',
  projects: '/api/admin/projects',
  sections: '/api/admin/sections',
  upload: '/api/admin/upload-image',
}

/* In-memory edit-form state for media so changes batch into one PATCH */
let mediaState = []
let coverState = null // {assetId, url} or null = unchanged

let rootEl = null
let state = {authed: false, view: 'list', sections: [], projects: [], editing: null, busy: false}

/* ─── Public API ───────────────────────────────────────────── */
export async function mountAdmin(sub) {
  if (!rootEl) {
    rootEl = document.createElement('section')
    rootEl.id = 'admin-root'
    rootEl.className = 'admin-root'
    document.body.appendChild(rootEl)
    injectStyles()
  }
  rootEl.classList.add('open')
  rootEl.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'

  await refreshAuth()
  if (state.authed) await refreshLists()
  render()
}

export function unmountAdmin() {
  if (!rootEl) return
  rootEl.classList.remove('open')
  rootEl.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}

/* ─── Network ──────────────────────────────────────────────── */
async function refreshAuth() {
  try {
    const r = await fetch(API.me, {credentials: 'same-origin'})
    const j = await r.json()
    state.authed = !!j.authed
  } catch {
    state.authed = false
  }
}

async function refreshLists() {
  try {
    const [s, p] = await Promise.all([
      fetch(API.sections, {credentials: 'same-origin'}).then((r) => r.json()),
      fetch(API.projects, {credentials: 'same-origin'}).then((r) => r.json()),
    ])
    state.sections = s.sections || []
    state.projects = p.projects || []
  } catch (e) {
    console.error('Failed to load admin lists', e)
  }
}

async function loginWith(password) {
  state.busy = true
  render()
  try {
    const r = await fetch(API.login, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({password}),
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.ok) {
      state.authed = true
      await refreshLists()
    } else {
      alert(j.error || 'Login failed')
    }
  } finally {
    state.busy = false
    render()
  }
}

async function logout() {
  await fetch(API.logout, {method: 'POST', credentials: 'same-origin'})
  state.authed = false
  state.editing = null
  render()
}

async function loadDoc(kind, id) {
  const url = (kind === 'project' ? API.projects : API.sections) + `?id=${encodeURIComponent(id)}`
  const r = await fetch(url, {credentials: 'same-origin'})
  const j = await r.json()
  return j.project || j.section
}

async function saveDoc(kind, id, payload) {
  const url = (kind === 'project' ? API.projects : API.sections) + `?id=${encodeURIComponent(id)}`
  const r = await fetch(url, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'Save failed')
  return j
}

/* ─── Render ───────────────────────────────────────────────── */
function render() {
  if (!rootEl) return
  if (!state.authed) return renderLogin()
  if (state.editing) return renderEdit()
  return renderDashboard()
}

function renderLogin() {
  rootEl.innerHTML = `
    <div class="adm-shell">
      <header class="adm-topbar">
        <a class="adm-brand" href="/">
          <svg viewBox="30 320 530 165" fill="currentColor" aria-hidden="true">
            <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
            <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
            <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
          </svg>
          <span>Studio · Admin</span>
        </a>
      </header>
      <div class="adm-login-card">
        <div class="adm-login-kicker">— Authentication required</div>
        <h1 class="adm-login-title">Sign in.</h1>
        <p class="adm-login-lead">Enter your admin password to edit content directly from the site.</p>
        <form class="adm-login-form" id="adm-login-form" autocomplete="off">
          <input type="password" id="adm-password" name="password" placeholder="Password" autocomplete="current-password" autofocus required ${state.busy ? 'disabled' : ''}>
          <button type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Signing in…' : 'Sign in →'}</button>
        </form>
        <div class="adm-login-hint">
          Or <a href="https://madboulyjr-studio.sanity.studio" target="_blank" rel="noopener">open Sanity Studio ↗</a> for the full editor.
        </div>
      </div>
    </div>
  `
  rootEl.querySelector('#adm-login-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const pwd = rootEl.querySelector('#adm-password').value
    loginWith(pwd)
  })
}

function renderDashboard() {
  const projectsBySection = {}
  for (const p of state.projects) {
    const k = p.sectionSlug || 'unassigned'
    if (!projectsBySection[k]) projectsBySection[k] = []
    projectsBySection[k].push(p)
  }
  rootEl.innerHTML = `
    <div class="adm-shell">
      <header class="adm-topbar">
        <a class="adm-brand" href="/">
          <svg viewBox="30 320 530 165" fill="currentColor" aria-hidden="true">
            <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
            <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
            <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
          </svg>
          <span>Studio · Admin</span>
        </a>
        <div class="adm-topbar-actions">
          <a class="adm-link" href="https://madboulyjr-studio.sanity.studio" target="_blank" rel="noopener">Sanity Studio ↗</a>
          <button class="adm-link" id="adm-logout">Sign out</button>
        </div>
      </header>

      <div class="adm-dashboard">
        <div class="adm-dash-kicker">— Sections</div>
        <div class="adm-grid">
          ${state.sections
            .map(
              (s) => `
            <button class="adm-card" data-kind="section" data-id="${s._id}">
              <div class="adm-card-num">${String(s.order || 0).padStart(2, '0')}</div>
              <div class="adm-card-title">${escapeHtml(s.title || s.slug)}</div>
              <div class="adm-card-sub">${escapeHtml(s.subtitle || '')}</div>
              <div class="adm-card-edit">Edit ↗</div>
            </button>
          `,
            )
            .join('')}
        </div>

        ${state.sections
          .map((s) => {
            const list = projectsBySection[s.slug] || []
            return `
          <div class="adm-section-block">
            <div class="adm-dash-kicker">— ${escapeHtml(s.title || s.slug)} · ${list.length} projects</div>
            ${list.length
              ? `<div class="adm-list">${list
                  .map(
                    (p) => `
                <button class="adm-row" data-kind="project" data-id="${p._id}">
                  <span class="adm-row-title">${escapeHtml(p.title)}${p.year ? ` · ${escapeHtml(p.year)}` : ''}</span>
                  <span class="adm-row-meta">
                    ${p.published ? '' : '<span class="adm-tag adm-tag-warn">draft</span>'}
                    ${(p.tags || []).slice(0, 2).map((t) => `<span class="adm-tag">${escapeHtml(t)}</span>`).join('')}
                  </span>
                  <span class="adm-row-edit">Edit ↗</span>
                </button>
              `,
                  )
                  .join('')}</div>`
              : '<div class="adm-empty">No projects in this section yet. Add one via Sanity Studio.</div>'}
          </div>`
          })
          .join('')}
      </div>
    </div>
  `
  rootEl.querySelector('#adm-logout').addEventListener('click', logout)
  rootEl.querySelectorAll('[data-kind]').forEach((el) => {
    el.addEventListener('click', async () => {
      const kind = el.dataset.kind
      const id = el.dataset.id
      state.busy = true
      render()
      const doc = await loadDoc(kind, id)
      state.editing = {kind, id, doc}
      state.busy = false
      render()
    })
  })
}

function renderEdit() {
  const {kind, doc} = state.editing
  rootEl.innerHTML = `
    <div class="adm-shell">
      <header class="adm-topbar">
        <button class="adm-link" id="adm-back">← Back</button>
        <a class="adm-brand" href="/">
          <svg viewBox="30 320 530 165" fill="currentColor" aria-hidden="true">
            <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
            <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
            <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
          </svg>
          <span>Studio · Admin · Edit</span>
        </a>
        <div class="adm-topbar-actions"></div>
      </header>
      <div class="adm-edit">
        ${kind === 'project' ? renderProjectForm(doc) : renderSectionForm(doc)}
      </div>
    </div>
  `
  rootEl.querySelector('#adm-back').addEventListener('click', () => {
    state.editing = null
    render()
  })
  bindEditFormHandlers(kind, doc._id)
}

function renderProjectForm(p) {
  const cs = p.caseStudy || {}
  const outcomeRows = (cs.outcome || []).map((o, i) => {
    return `
      <div class="adm-outcome-row" data-i="${i}">
        <input class="adm-input" name="outcome-metric-${i}" value="${escapeAttr(o.metric || '')}" placeholder="metric (e.g. +28%)" maxlength="12">
        <input class="adm-input" name="outcome-label-${i}" value="${escapeAttr(o.label || '')}" placeholder="label (e.g. lift in conversion)">
        <button type="button" class="adm-link adm-outcome-remove" data-i="${i}">Remove</button>
      </div>`
  })
  return `
    <form class="adm-form" id="adm-form" autocomplete="off">
      <h2 class="adm-edit-title">${escapeHtml(p.title)}</h2>
      <div class="adm-edit-meta">project · ${escapeHtml(p.sectionSlug || '')} · slug: ${escapeHtml(p.slug || '')}</div>

      <fieldset class="adm-fields">
        <legend>Basics</legend>
        <label>Title <input class="adm-input" name="title" value="${escapeAttr(p.title || '')}" required></label>
        <label>Year <input class="adm-input" name="year" value="${escapeAttr(p.year || '')}" placeholder="e.g. 2024"></label>
        <label>Caption <textarea class="adm-textarea" name="caption" rows="3">${escapeHtml(p.caption || '')}</textarea></label>
        <label>Tags (comma-separated) <input class="adm-input" name="tags" value="${escapeAttr((p.tags || []).join(', '))}"></label>
        <label class="adm-checkbox"><input type="checkbox" name="published" ${p.published !== false ? 'checked' : ''}> Published</label>
      </fieldset>

      <fieldset class="adm-fields adm-fields-image">
        <legend>Cover image</legend>
        <div class="adm-cover-zone" data-cover-current="${escapeAttr(p.coverImage?.assetId || '')}">
          ${p.coverImage?.url
            ? `<img class="adm-cover-preview" src="${escapeAttr(p.coverImage.url)}?w=800&auto=format" alt="Current cover">`
            : '<div class="adm-cover-empty">No cover yet — drop or click to upload</div>'}
          <div class="adm-cover-actions">
            <label class="adm-cover-btn">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden id="adm-cover-input">
              <span>${p.coverImage?.url ? 'Replace cover ↑' : 'Upload cover ↑'}</span>
            </label>
            ${p.coverImage?.url ? '<button type="button" class="adm-link adm-cover-remove">Remove</button>' : ''}
          </div>
          <div class="adm-cover-status" id="adm-cover-status"></div>
        </div>
      </fieldset>

      <fieldset class="adm-fields adm-fields-gallery">
        <legend>Project gallery (${(p.media || []).length} items)</legend>
        <div class="adm-gallery-hint">
          Drag to reorder · click × to remove · drop new images at the end
        </div>
        <div class="adm-gallery-grid" id="adm-gallery-grid">
          ${(p.media || []).map((m, i) => renderGalleryThumb(m, i)).join('')}
          <label class="adm-gallery-add">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden id="adm-gallery-input" multiple>
            <span class="adm-gallery-add-icon" aria-hidden="true">+</span>
            <span class="adm-gallery-add-label">Add images</span>
          </label>
        </div>
        <div class="adm-cover-status" id="adm-gallery-status"></div>
        <div class="adm-gallery-note">
          <strong>Videos:</strong> upload via <a href="https://madboulyjr-studio.sanity.studio" target="_blank" rel="noopener">Sanity Studio ↗</a> for now
          (Mux transcoding happens there). They'll appear in the gallery after publishing.
        </div>
      </fieldset>

      <fieldset class="adm-fields">
        <legend>Case study</legend>
        <label>Role <input class="adm-input" name="cs-role" value="${escapeAttr(cs.role || '')}" placeholder="e.g. Art Direction · Creative Direction"></label>
        <label>Client <input class="adm-input" name="cs-client" value="${escapeAttr(cs.client || '')}"></label>
        <label>Agency / collaborator <input class="adm-input" name="cs-agency" value="${escapeAttr(cs.agency || '')}"></label>
        <label>Problem <textarea class="adm-textarea" name="cs-problem" rows="3">${escapeHtml(cs.problem || '')}</textarea></label>
        <label>Constraints (comma-separated) <input class="adm-input" name="cs-constraints" value="${escapeAttr((cs.constraints || []).join(', '))}" placeholder="e.g. 8-week timeline, OOH only"></label>
        <label>Awards (comma-separated) <input class="adm-input" name="cs-awards" value="${escapeAttr((cs.awards || []).join(', '))}"></label>
        <label>External case-study URL <input class="adm-input" name="cs-externalUrl" value="${escapeAttr(cs.externalUrl || '')}" placeholder="https://…"></label>
        <div class="adm-outcome-block">
          <div class="adm-outcome-label">Outcome metrics (max 4) <button type="button" id="adm-outcome-add" class="adm-link">+ Add</button></div>
          <div class="adm-outcome-list" id="adm-outcome-list">${outcomeRows.join('')}</div>
        </div>
      </fieldset>

      <div class="adm-form-actions">
        <button type="submit" class="adm-save">Save changes</button>
        <span class="adm-form-status" id="adm-form-status"></span>
      </div>
    </form>
  `
}

function renderSectionForm(s) {
  return `
    <form class="adm-form" id="adm-form" autocomplete="off">
      <h2 class="adm-edit-title">${escapeHtml(s.title || s.slug)}</h2>
      <div class="adm-edit-meta">section · slug: ${escapeHtml(s.slug?.current || s.slug || '')}</div>

      <fieldset class="adm-fields">
        <legend>Headlines</legend>
        <label>Title <input class="adm-input" name="title" value="${escapeAttr(s.title || '')}" required></label>
        <label>Subtitle <input class="adm-input" name="subtitle" value="${escapeAttr(s.subtitle || '')}"></label>
        <label>Description <textarea class="adm-textarea" name="description" rows="2">${escapeHtml(s.description || '')}</textarea></label>
        <label>Card label <input class="adm-input" name="cardLabel" value="${escapeAttr(s.cardLabel || '')}"></label>
      </fieldset>

      <fieldset class="adm-fields">
        <legend>Detail page copy</legend>
        <label>Kicker <input class="adm-input" name="kicker" value="${escapeAttr(s.kicker || '')}" placeholder="e.g. 01 / The Main Practice"></label>
        <label>Manifesto (HTML <em> allowed) <textarea class="adm-textarea" name="manifesto" rows="3">${escapeHtml(s.manifesto || '')}</textarea></label>
        <label>Lead paragraph (HTML <strong> allowed) <textarea class="adm-textarea" name="lead" rows="6">${escapeHtml(s.lead || '')}</textarea></label>
        <label>Agencies list (comma-separated) <input class="adm-input" name="agencies" value="${escapeAttr((s.agencies || []).join(', '))}"></label>
        <label>Works section label <input class="adm-input" name="worksLabel" value="${escapeAttr(s.worksLabel || '')}"></label>
        <label>Works section title <input class="adm-input" name="worksTitle" value="${escapeAttr(s.worksTitle || '')}"></label>
      </fieldset>

      <div class="adm-form-actions">
        <button type="submit" class="adm-save">Save changes</button>
        <span class="adm-form-status" id="adm-form-status"></span>
      </div>
    </form>
  `
}

/* COVER IMAGE upload + remove */
function bindCoverUpload(projectId) {
  const input = rootEl.querySelector('#adm-cover-input')
  const status = rootEl.querySelector('#adm-cover-status')
  const zone = rootEl.querySelector('.adm-cover-zone')
  const removeBtn = rootEl.querySelector('.adm-cover-remove')
  if (!input || !zone) return
  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    status.textContent = `Uploading ${file.name}…`
    try {
      const asset = await uploadFile(file)
      coverState = {assetId: asset._id, url: asset.url}
      // Update preview live
      const preview = zone.querySelector('.adm-cover-preview')
      const empty = zone.querySelector('.adm-cover-empty')
      if (preview) preview.src = asset.url + '?w=800&auto=format'
      else if (empty) {
        empty.outerHTML = `<img class="adm-cover-preview" src="${asset.url}?w=800&auto=format" alt="New cover">`
      }
      status.textContent = '✓ Uploaded — click "Save changes" to apply'
    } catch (err) {
      status.textContent = '✗ ' + err.message
    }
  })
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      coverState = {remove: true}
      const preview = zone.querySelector('.adm-cover-preview')
      if (preview) preview.replaceWith(Object.assign(document.createElement('div'), {className: 'adm-cover-empty', textContent: 'Cover removed (will save when you click "Save changes")'}))
      removeBtn.remove()
      status.textContent = 'Cover marked for removal'
    })
  }
}

/* GALLERY — add/remove/reorder */
function bindGallery(projectId) {
  const grid = rootEl.querySelector('#adm-gallery-grid')
  const input = rootEl.querySelector('#adm-gallery-input')
  const status = rootEl.querySelector('#adm-gallery-status')
  if (!grid) return

  // Add new images via input
  if (input) {
    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      for (const file of files) {
        status.textContent = `Uploading ${file.name}…`
        try {
          const asset = await uploadFile(file)
          mediaState.push({
            _type: 'image',
            _key: Math.random().toString(36).slice(2, 12),
            assetId: asset._id,
            url: asset.url,
          })
        } catch (err) {
          status.textContent = '✗ ' + err.message
        }
      }
      status.textContent = `✓ Added ${files.length} image${files.length > 1 ? 's' : ''} — click "Save changes" to apply`
      reRenderGallery()
      input.value = '' // reset so same file can be re-added
    })
  }

  // Remove (delegated)
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.adm-thumb-remove')
    if (!btn) return
    const i = parseInt(btn.dataset.i, 10)
    if (Number.isFinite(i)) {
      mediaState.splice(i, 1)
      status.textContent = 'Item removed — click "Save changes" to apply'
      reRenderGallery()
    }
  })

  // Drag-and-drop reorder
  let draggedIdx = null
  grid.addEventListener('dragstart', (e) => {
    const thumb = e.target.closest('.adm-gallery-thumb')
    if (!thumb) return
    draggedIdx = parseInt(thumb.dataset.i, 10)
    e.dataTransfer.effectAllowed = 'move'
    thumb.classList.add('adm-thumb-dragging')
  })
  grid.addEventListener('dragend', () => {
    grid.querySelectorAll('.adm-thumb-dragging').forEach((el) => el.classList.remove('adm-thumb-dragging'))
    draggedIdx = null
  })
  grid.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  })
  grid.addEventListener('drop', (e) => {
    e.preventDefault()
    const target = e.target.closest('.adm-gallery-thumb')
    if (!target || draggedIdx === null) return
    const dropIdx = parseInt(target.dataset.i, 10)
    if (dropIdx === draggedIdx) return
    const item = mediaState.splice(draggedIdx, 1)[0]
    mediaState.splice(dropIdx, 0, item)
    status.textContent = 'Reordered — click "Save changes" to apply'
    reRenderGallery()
  })
}

function reRenderGallery() {
  const grid = rootEl.querySelector('#adm-gallery-grid')
  if (!grid) return
  // Save the +Add label (persistent file input listener), rebuild thumbs,
  // re-append the label. Listeners on the grid container (delegated click,
  // dragover, drop) survive innerHTML changes — no rebind needed.
  const addLabel = grid.querySelector('.adm-gallery-add')
  grid.innerHTML = mediaState.map((m, i) => renderGalleryThumb(m, i)).join('')
  if (addLabel) grid.appendChild(addLabel)
}

function bindEditFormHandlers(kind, id) {
  const form = rootEl.querySelector('#adm-form')
  if (!form) return

  // Reset edit-form state for fresh media tracking
  if (kind === 'project' && state.editing?.doc) {
    mediaState = (state.editing.doc.media || []).map((m) => ({...m}))
    coverState = null
    bindCoverUpload(id)
    bindGallery(id)
  }

  // Outcome row add/remove
  const outcomeAdd = rootEl.querySelector('#adm-outcome-add')
  if (outcomeAdd) {
    outcomeAdd.addEventListener('click', () => {
      const list = rootEl.querySelector('#adm-outcome-list')
      const i = list.children.length
      if (i >= 4) return
      const div = document.createElement('div')
      div.className = 'adm-outcome-row'
      div.dataset.i = i
      div.innerHTML = `
        <input class="adm-input" name="outcome-metric-${i}" placeholder="metric (e.g. +28%)" maxlength="12">
        <input class="adm-input" name="outcome-label-${i}" placeholder="label">
        <button type="button" class="adm-link adm-outcome-remove" data-i="${i}">Remove</button>
      `
      list.appendChild(div)
    })
  }
  rootEl.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('adm-outcome-remove')) {
      e.preventDefault()
      e.target.closest('.adm-outcome-row').remove()
    }
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const data = new FormData(form)
    const status = rootEl.querySelector('#adm-form-status')
    status.textContent = 'Saving…'
    try {
      const payload = kind === 'project' ? collectProjectPayload(data, form) : collectSectionPayload(data)
      await saveDoc(kind, id, payload)
      status.textContent = '✓ Saved. Live changes will appear in ~60s.'
      // Refresh dashboard data so list re-renders fresh
      await refreshLists()
    } catch (err) {
      status.textContent = '✗ ' + (err.message || 'Save failed')
    }
  })
}

function collectProjectPayload(data, form) {
  const splitCsv = (s) =>
    String(s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  const outcome = []
  // Walk through the rendered outcome rows
  form.querySelectorAll('.adm-outcome-row').forEach((row) => {
    const i = row.dataset.i
    const metric = (data.get(`outcome-metric-${i}`) || '').toString().trim()
    const label = (data.get(`outcome-label-${i}`) || '').toString().trim()
    if (metric || label) outcome.push({metric, label})
  })
  const payload = {
    title: data.get('title') || '',
    year: data.get('year') || '',
    caption: data.get('caption') || '',
    tags: splitCsv(data.get('tags')),
    published: data.get('published') === 'on',
    caseStudy: {
      role: data.get('cs-role') || '',
      client: data.get('cs-client') || '',
      agency: data.get('cs-agency') || '',
      problem: data.get('cs-problem') || '',
      constraints: splitCsv(data.get('cs-constraints')),
      awards: splitCsv(data.get('cs-awards')),
      externalUrl: data.get('cs-externalUrl') || '',
      outcome,
    },
  }
  // Cover image — only include if user uploaded a new one or removed it
  if (coverState && coverState.assetId) {
    payload.coverImage = {assetId: coverState.assetId}
  } else if (coverState && coverState.remove) {
    payload.coverImage = null // PATCH set null clears the field
  }
  // Media gallery — always send the current ordered list (additions,
  // removals, reorders are all reflected in mediaState)
  payload.media = mediaState.map((m) => {
    if (m._type === 'videoItem') {
      return {_type: 'videoItem', _key: m._key, video: m.video, caption: m.caption, autoplay: m.autoplay}
    }
    return {_type: 'image', _key: m._key, assetId: m.assetId || m.asset?._ref}
  })
  return payload
}

function collectSectionPayload(data) {
  const splitCsv = (s) =>
    String(s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  return {
    title: data.get('title') || '',
    subtitle: data.get('subtitle') || '',
    description: data.get('description') || '',
    cardLabel: data.get('cardLabel') || '',
    kicker: data.get('kicker') || '',
    manifesto: data.get('manifesto') || '',
    lead: data.get('lead') || '',
    agencies: splitCsv(data.get('agencies')),
    worksLabel: data.get('worksLabel') || '',
    worksTitle: data.get('worksTitle') || '',
  }
}

/* ─── Gallery helpers ──────────────────────────────────────── */
function renderGalleryThumb(m, i) {
  const isVideo = m._type === 'videoItem'
  const url = m.url || (m.asset?.url) || ''
  const assetId = m.assetId || m.asset?._ref || ''
  return `
    <div class="adm-gallery-thumb${isVideo ? ' is-video' : ''}" data-i="${i}" data-asset-id="${escapeAttr(assetId)}" data-type="${isVideo ? 'video' : 'image'}" draggable="true">
      ${isVideo
        ? `<div class="adm-thumb-video" aria-hidden="true">▶</div>
           <div class="adm-thumb-label">Video · edit in Studio</div>`
        : url
          ? `<img src="${escapeAttr(url)}?w=300&auto=format" alt="Gallery image ${i + 1}" loading="lazy">`
          : `<div class="adm-thumb-empty">image</div>`}
      <button type="button" class="adm-thumb-remove" aria-label="Remove" data-i="${i}">×</button>
    </div>
  `
}

/* File → base64 (for upload-image API) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1] || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadFile(file) {
  const base64 = await fileToBase64(file)
  const r = await fetch(API.upload, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filename: file.name, contentType: file.type, base64}),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'Upload failed')
  return j.asset
}

/* ─── Helpers ──────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(str) {
  return escapeHtml(str)
}

/* ─── Styles (injected once on first mount) ─────────────────── */
let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const css = `
.admin-root{
  position:fixed;inset:0;z-index:500;
  display:none;background:#0A0A0A;color:#F5F0E1;
  overflow-y:auto;
  font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:400;
}
.admin-root.open{display:block}
.adm-shell{max-width:88rem;margin:0 auto;padding:2rem 2.4rem 6rem}
.adm-topbar{
  display:flex;justify-content:space-between;align-items:center;gap:1.5rem;
  padding:1rem 0 2.4rem;border-bottom:0.08rem solid rgba(245,240,225,0.1);
  margin-bottom:3.5rem;
}
.adm-brand{
  display:inline-flex;align-items:center;gap:0.7rem;
  color:#F5F0E1;text-decoration:none;
}
.adm-brand svg{height:1.7rem;width:auto;color:#F5F0E1;flex-shrink:0}
.adm-brand span{
  font-family:'Newsreader',serif;font-style:italic;font-weight:500;
  font-size:1rem;letter-spacing:-0.01em;
  color:#F5F0E1;opacity:0.85;
}
.adm-topbar-actions{display:flex;gap:1rem;align-items:center}
.adm-link{
  background:transparent;border:0;cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.78rem;letter-spacing:0.18em;text-transform:uppercase;
  color:#F5F0E1;text-decoration:none;opacity:0.65;
  transition:opacity 0.2s ease, color 0.2s ease;
  padding:0.4rem 0;
}
.adm-link:hover{opacity:1;color:#D0FA51}

/* LOGIN */
.adm-login-card{
  max-width:36rem;margin:6rem auto 0;
  padding:3rem;border:0.08rem solid rgba(245,240,225,0.1);
  border-radius:1rem;background:#161310;
}
.adm-login-kicker{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.78rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;margin-bottom:1rem;
}
.adm-login-title{
  font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:500;
  font-size:3rem;letter-spacing:-0.025em;line-height:1;
  margin:0 0 1rem;color:#F5F0E1;
}
.adm-login-lead{
  font-family:'Newsreader',serif;font-weight:400;font-style:italic;
  font-size:1.1rem;line-height:1.5;
  color:#F5F0E1;opacity:0.8;
  margin:0 0 2rem;
}
.adm-login-form{display:flex;gap:0.6rem;margin-bottom:1.4rem}
.adm-login-form input,
.adm-login-form button{
  height:3rem;padding:0 1.2rem;border-radius:999px;
  font-family:'Hanken Grotesk',sans-serif;font-size:1rem;
  border:0.08rem solid rgba(245,240,225,0.2);background:#0A0A0A;
  color:#F5F0E1;
}
.adm-login-form input{flex:1;outline:none}
.adm-login-form input:focus{border-color:#D0FA51}
.adm-login-form button{
  background:#D0FA51;color:#1A1815;border-color:transparent;
  font-weight:600;cursor:pointer;
  transition:background 0.2s ease, transform 0.2s ease;
}
.adm-login-form button:hover:not(:disabled){background:#fff;transform:translateY(-1px)}
.adm-login-form button:disabled{opacity:0.5;cursor:not-allowed}
.adm-login-hint{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.75rem;letter-spacing:0.16em;text-transform:uppercase;
  opacity:0.6;
}
.adm-login-hint a{color:#D0FA51;text-decoration:underline}

/* DASHBOARD */
.adm-dashboard{display:flex;flex-direction:column;gap:3rem}
.adm-dash-kicker{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.78rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;margin-bottom:1.2rem;
}
.adm-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit, minmax(15rem, 1fr));
  gap:0.7rem;margin-bottom:2rem;
}
.adm-card{
  display:flex;flex-direction:column;align-items:flex-start;
  background:#161310;border:0.08rem solid rgba(245,240,225,0.1);
  border-radius:0.8rem;padding:1.6rem 1.4rem 1.2rem;
  cursor:pointer;text-align:left;
  font-family:inherit;color:#F5F0E1;
  transition:background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  min-height:8rem;justify-content:space-between;
}
.adm-card:hover{background:#23201B;border-color:rgba(245,240,225,0.3);transform:translateY(-2px)}
.adm-card-num{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.72rem;letter-spacing:0.22em;opacity:0.55;
  color:#D0FA51;margin-bottom:0.5rem;
}
.adm-card-title{
  font-family:'Hanken Grotesk',sans-serif;font-weight:600;
  font-size:1.25rem;line-height:1.1;margin-bottom:0.3rem;
}
.adm-card-sub{
  font-family:'Newsreader',serif;font-style:italic;font-weight:400;
  font-size:0.9rem;opacity:0.65;margin-bottom:0.8rem;
}
.adm-card-edit{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.6;margin-top:auto;align-self:flex-end;
}
.adm-card:hover .adm-card-edit{opacity:1;color:#D0FA51}

.adm-section-block{margin-bottom:2rem}
.adm-list{display:flex;flex-direction:column;gap:0.4rem}
.adm-row{
  display:flex;justify-content:space-between;align-items:center;gap:1rem;
  padding:1rem 1.4rem;
  background:#161310;border:0.08rem solid rgba(245,240,225,0.08);
  border-radius:0.6rem;cursor:pointer;
  font-family:inherit;color:#F5F0E1;text-align:left;
  transition:background 0.2s ease, border-color 0.2s ease;
}
.adm-row:hover{background:#23201B;border-color:rgba(245,240,225,0.18)}
.adm-row-title{font-weight:500;font-size:1rem;letter-spacing:-0.01em;flex:1;min-width:0}
.adm-row-meta{display:flex;gap:0.4rem;align-items:center;flex-shrink:0}
.adm-row-edit{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;flex-shrink:0;
}
.adm-row:hover .adm-row-edit{opacity:1;color:#D0FA51}
.adm-tag{
  background:rgba(245,240,225,0.06);
  padding:0.18rem 0.55rem;border-radius:999px;
  font-family:'Hanken Grotesk',sans-serif;font-size:0.72rem;font-weight:500;
}
.adm-tag-warn{background:rgba(208,250,81,0.18);color:#D0FA51}
.adm-empty{
  padding:1.2rem 1.4rem;
  background:rgba(245,240,225,0.03);
  border-radius:0.6rem;
  font-family:'Newsreader',serif;font-style:italic;
  font-size:0.95rem;opacity:0.6;
}

/* EDIT FORM */
.adm-edit{max-width:60rem}
.adm-edit-title{
  font-family:'Hanken Grotesk',sans-serif;font-weight:500;
  font-size:2.4rem;letter-spacing:-0.025em;line-height:1;
  margin:0 0 0.5rem;
}
.adm-edit-meta{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.5;margin-bottom:2.4rem;
}
.adm-fields{
  border:0.08rem solid rgba(245,240,225,0.1);
  border-radius:0.8rem;
  padding:1.5rem 1.6rem 1.2rem;
  margin:0 0 1.5rem;
  display:flex;flex-direction:column;gap:1rem;
}
.adm-fields legend{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.72rem;letter-spacing:0.22em;text-transform:uppercase;
  color:#D0FA51;padding:0 0.5rem;
}
.adm-form label{
  display:flex;flex-direction:column;gap:0.4rem;
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.16em;text-transform:uppercase;
  opacity:0.7;
}
.adm-form label.adm-checkbox{
  flex-direction:row;align-items:center;gap:0.6rem;
}
.adm-input,.adm-textarea{
  background:#0A0A0A;border:0.08rem solid rgba(245,240,225,0.18);
  color:#F5F0E1;
  padding:0.7rem 0.95rem;border-radius:0.5rem;
  font-family:'Hanken Grotesk',sans-serif;font-weight:400;
  font-size:0.95rem;letter-spacing:0;text-transform:none;
  outline:none;
  transition:border-color 0.2s ease;
}
.adm-input:focus,.adm-textarea:focus{border-color:#D0FA51}
.adm-textarea{resize:vertical;min-height:5rem;font-family:'Hanken Grotesk',sans-serif}
.adm-form input[type="checkbox"]{
  width:1.1rem;height:1.1rem;accent-color:#D0FA51;
}
.adm-outcome-block{margin-top:0.5rem}
.adm-outcome-label{
  display:flex;justify-content:space-between;align-items:center;
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.16em;text-transform:uppercase;
  opacity:0.7;margin-bottom:0.5rem;
}
.adm-outcome-list{display:flex;flex-direction:column;gap:0.5rem}
.adm-outcome-row{display:grid;grid-template-columns:8rem 1fr auto;gap:0.5rem;align-items:center}
.adm-outcome-remove{font-size:0.65rem !important;color:#FF5577 !important;opacity:0.7 !important}
.adm-outcome-remove:hover{opacity:1 !important}

.adm-form-actions{display:flex;gap:1.2rem;align-items:center;margin-top:1rem}
.adm-save{
  height:3rem;padding:0 2rem;border-radius:999px;border:0;
  background:#D0FA51;color:#1A1815;
  font-family:'Hanken Grotesk',sans-serif;font-weight:600;font-size:1rem;
  cursor:pointer;
  transition:background 0.2s ease, transform 0.2s ease;
}
.adm-save:hover{background:#fff;transform:translateY(-1px)}
.adm-form-status{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.78rem;letter-spacing:0.16em;text-transform:uppercase;
  opacity:0.7;
}

/* ─── COVER IMAGE UPLOAD ─── */
.adm-fields-image legend, .adm-fields-gallery legend{color:#D0FA51}
.adm-cover-zone{
  display:flex;flex-direction:column;gap:0.8rem;
}
.adm-cover-preview{
  width:100%;max-width:36rem;
  aspect-ratio:16/10;
  object-fit:cover;
  background:#0A0A0A;
  border-radius:0.6rem;
  border:0.08rem solid rgba(245,240,225,0.1);
}
.adm-cover-empty{
  width:100%;max-width:36rem;
  aspect-ratio:16/10;
  display:flex;align-items:center;justify-content:center;
  background:#0A0A0A;
  border:0.08rem dashed rgba(245,240,225,0.18);
  border-radius:0.6rem;
  color:#F5F0E1;opacity:0.5;
  font-family:'Newsreader',serif;font-style:italic;
}
.adm-cover-actions{display:flex;gap:0.8rem;align-items:center;flex-wrap:wrap}
.adm-cover-btn{
  display:inline-flex;align-items:center;
  padding:0.55rem 1.1rem;border-radius:999px;
  background:#D0FA51;color:#1A1815;
  font-family:'Hanken Grotesk',sans-serif;font-weight:600;font-size:0.9rem;
  cursor:pointer;
  transition:background 0.2s ease, transform 0.2s ease;
}
.adm-cover-btn:hover{background:#fff;transform:translateY(-1px)}
.adm-cover-status{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;
  opacity:0.7;min-height:1rem;
}

/* ─── GALLERY GRID ─── */
.adm-gallery-hint{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.14em;text-transform:uppercase;
  opacity:0.5;margin-bottom:0.2rem;
}
.adm-gallery-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(8rem, 1fr));
  gap:0.6rem;
}
.adm-gallery-thumb{
  position:relative;
  aspect-ratio:1;
  background:#0A0A0A;
  border-radius:0.5rem;
  overflow:hidden;
  cursor:grab;
  border:0.08rem solid rgba(245,240,225,0.08);
  transition:border-color 0.2s ease, transform 0.2s ease;
}
.adm-gallery-thumb:active{cursor:grabbing}
.adm-gallery-thumb:hover{border-color:rgba(245,240,225,0.25)}
.adm-gallery-thumb img{
  width:100%;height:100%;object-fit:cover;display:block;
  pointer-events:none; /* drag goes to .adm-gallery-thumb */
}
.adm-thumb-empty{
  display:flex;align-items:center;justify-content:center;
  width:100%;height:100%;
  font-family:'IBM Plex Mono',monospace;font-size:0.7rem;
  text-transform:uppercase;letter-spacing:0.14em;opacity:0.4;
}
.adm-thumb-video{
  display:flex;align-items:center;justify-content:center;
  width:100%;height:100%;
  background:linear-gradient(135deg, #1A1815, #0A0A0A);
  font-size:1.6rem;color:#D0FA51;
}
.adm-thumb-label{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(0,0,0,0.7);
  padding:0.3rem 0.5rem;
  font-family:'IBM Plex Mono',monospace;font-size:0.6rem;
  letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;
}
.adm-thumb-remove{
  position:absolute;top:0.4rem;right:0.4rem;
  width:1.5rem;height:1.5rem;border-radius:50%;
  background:rgba(0,0,0,0.7);color:#F5F0E1;
  border:0;cursor:pointer;
  font-size:1rem;font-weight:500;line-height:1;
  display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity 0.2s ease, background 0.2s ease;
}
.adm-gallery-thumb:hover .adm-thumb-remove{opacity:1}
.adm-thumb-remove:hover{background:#FF5577}
.adm-thumb-dragging{opacity:0.4;transform:scale(0.95)}
.adm-gallery-add{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  aspect-ratio:1;
  border:0.08rem dashed rgba(245,240,225,0.2);border-radius:0.5rem;
  cursor:pointer;
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.65rem;letter-spacing:0.14em;text-transform:uppercase;
  color:#F5F0E1;opacity:0.65;
  transition:border-color 0.2s ease, opacity 0.2s ease, color 0.2s ease;
}
.adm-gallery-add:hover{
  border-color:#D0FA51;opacity:1;color:#D0FA51;
}
.adm-gallery-add-icon{font-size:1.6rem;margin-bottom:0.2rem;opacity:0.7}
.adm-gallery-note{
  font-family:'Newsreader',serif;font-style:italic;font-size:0.85rem;
  opacity:0.7;margin-top:0.5rem;
}
.adm-gallery-note a{color:#D0FA51}

@media (max-width: 768px){
  .adm-shell{padding:1rem 1.25rem 5rem}
  .adm-topbar{margin-bottom:2rem;padding:0.6rem 0 1.6rem;flex-wrap:wrap;gap:0.8rem}
  .adm-login-card{margin-top:2rem;padding:2rem 1.5rem}
  .adm-login-title{font-size:2.2rem}
  .adm-grid{grid-template-columns:1fr 1fr}
  .adm-card{min-height:7rem;padding:1.2rem 1rem}
  .adm-row{padding:0.85rem 1rem;flex-wrap:wrap;gap:0.4rem 0.8rem}
  .adm-edit-title{font-size:1.8rem}
  .adm-fields{padding:1.2rem 1.2rem 0.9rem}
  .adm-outcome-row{grid-template-columns:1fr 1fr;gap:0.4rem}
  .adm-outcome-remove{grid-column:1 / -1}
}
`
  const style = document.createElement('style')
  style.id = 'adm-styles'
  style.textContent = css
  document.head.appendChild(style)
}
