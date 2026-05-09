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
  videoInit: '/api/admin/video-init',
  videoFinalize: '/api/admin/video-finalize',
}

/* PUT a file via XMLHttpRequest so we get progress events (fetch doesn't
   support upload progress yet in browsers). Used for direct Mux uploads. */
function xhrUpload(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(file)
  })
}

/* In-memory edit-form state for media so changes batch into one PATCH */
let mediaState = []
let coverState = null // {assetId, url} or {remove: true} or null
let cropState = null // {top, left, right, bottom} all 0-1, all are fractions to chop from each edge

let rootEl = null
let state = {authed: false, view: 'list', sections: [], projects: [], editing: null, busy: false, searchQuery: ''}

/* Filter project list by free-text query (title, year, tags, slug). Case-insensitive,
   word-tokenized so "ramad 24" matches "Ramadan · 2024". */
function filterProjects(list, query) {
  if (!query || !query.trim()) return list
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return list.filter((p) => {
    const haystack = [
      p.title || '',
      p.slug || '',
      p.year || '',
      p.caption || '',
      ...(p.tags || []),
    ]
      .join(' ')
      .toLowerCase()
    return tokens.every((t) => haystack.includes(t))
  })
}

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
  // Body class fallback for browsers without :has() — also hides .cursor
  document.body.classList.add('is-admin')

  await refreshAuth()
  if (state.authed) await refreshLists()
  render()
}

export function unmountAdmin() {
  if (!rootEl) return
  rootEl.classList.remove('open')
  rootEl.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
  document.body.classList.remove('is-admin')
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
    } else if (r.status === 429) {
      const sec = Math.max(1, Number(j.retryAfterSec) || 60)
      const mins = Math.ceil(sec / 60)
      alert(`Too many failed attempts.\n\nTry again in ~${mins} minute${mins === 1 ? '' : 's'}.`)
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

async function createProject({sectionSlug, title}) {
  const r = await fetch(API.projects, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sectionSlug, title}),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'Create failed')
  return j.project
}

async function deleteProject(id) {
  const r = await fetch(`${API.projects}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'Delete failed')
  return true
}

async function reorderProjects(ids) {
  const r = await fetch(`${API.projects}?action=reorder`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ids}),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) throw new Error(j.error || 'Reorder failed')
  return true
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

        <div class="adm-search-wrap">
          <label class="adm-search-label" for="adm-search">Search</label>
          <input
            id="adm-search"
            class="adm-search"
            type="search"
            placeholder="Filter projects by title, year, tag…"
            autocomplete="off"
            value="${escapeAttr(state.searchQuery || '')}"
          >
          <span class="adm-search-count" id="adm-search-count" aria-live="polite"></span>
        </div>

        ${state.sections
          .map((s) => {
            const allList = projectsBySection[s.slug] || []
            const list = filterProjects(allList, state.searchQuery)
            const hidden = state.searchQuery && list.length === 0
            return `
          <div class="adm-section-block${hidden ? ' is-hidden-empty' : ''}" data-section-slug="${escapeAttr(s.slug)}" data-section-total="${allList.length}" data-section-shown="${list.length}">
            <div class="adm-section-head">
              <div class="adm-dash-kicker">— ${escapeHtml(s.title || s.slug)} · ${list.length} project${list.length === 1 ? '' : 's'}${state.searchQuery && allList.length !== list.length ? ` <span class="adm-dim">/ ${allList.length}</span>` : ''}</div>
              <button class="adm-link adm-add-project" data-section-slug="${escapeAttr(s.slug)}">+ Add project</button>
            </div>
            ${list.length
              ? `<div class="adm-list" data-section-slug="${escapeAttr(s.slug)}">${list
                  .map(
                    (p) => `
                <div class="adm-row" data-id="${p._id}" data-slug="${escapeAttr(p.slug)}" data-section-slug="${escapeAttr(s.slug)}" draggable="true">
                  <span class="adm-row-handle" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>
                  <button class="adm-row-main" data-action="edit" data-id="${p._id}">
                    <span class="adm-row-title">${escapeHtml(p.title)}${p.year ? ` · ${escapeHtml(p.year)}` : ''}</span>
                    <span class="adm-row-meta">
                      ${p.published ? '' : '<span class="adm-tag adm-tag-warn">draft</span>'}
                      ${(p.tags || []).slice(0, 2).map((t) => `<span class="adm-tag">${escapeHtml(t)}</span>`).join('')}
                    </span>
                  </button>
                  <button class="adm-row-action adm-row-edit-btn" data-action="edit" data-id="${p._id}" title="Edit">Edit ↗</button>
                  <button class="adm-row-action adm-row-delete-btn" data-action="delete" data-id="${p._id}" data-title="${escapeAttr(p.title)}" title="Delete">×</button>
                </div>
              `,
                  )
                  .join('')}</div>`
              : state.searchQuery
                ? `<div class="adm-empty">No matches in this section.</div>`
                : `<div class="adm-empty">No projects yet. Click "+ Add project" above to create one.</div>`}
          </div>`
          })
          .join('')}
      </div>
    </div>
  `
  rootEl.querySelector('#adm-logout').addEventListener('click', logout)

  // Search input — debounced filter (no full re-render, just hide/show rows
  // so input stays focused + cursor stays put). Re-renders only when search
  // toggles between empty/non-empty so the empty-state copy updates.
  const searchInput = rootEl.querySelector('#adm-search')
  if (searchInput) {
    const countEl = rootEl.querySelector('#adm-search-count')
    let searchT = null
    const applyFilter = () => {
      const q = (state.searchQuery || '').toLowerCase().trim()
      const tokens = q.split(/\s+/).filter(Boolean)
      let matched = 0
      let total = 0
      rootEl.querySelectorAll('.adm-section-block').forEach((block) => {
        const sectionSlug = block.dataset.sectionSlug
        const sectionList = projectsBySection[sectionSlug] || []
        const filtered = filterProjects(sectionList, state.searchQuery)
        const filteredIds = new Set(filtered.map((p) => p._id))
        let visible = 0
        block.querySelectorAll('.adm-row').forEach((row) => {
          if (filteredIds.has(row.dataset.id)) {
            row.style.display = ''
            visible++
          } else {
            row.style.display = 'none'
          }
        })
        matched += visible
        total += sectionList.length
        // Update header count
        const headEl = block.querySelector('.adm-section-head .adm-dash-kicker')
        if (headEl && state.sections.length) {
          const s = state.sections.find((x) => x.slug === sectionSlug)
          const title = (s?.title || sectionSlug || '')
          headEl.innerHTML = `— ${escapeHtml(title)} · ${visible} project${visible === 1 ? '' : 's'}${q && sectionList.length !== visible ? ` <span class="adm-dim">/ ${sectionList.length}</span>` : ''}`
        }
        // Hide whole block when search active + no matches
        block.classList.toggle('is-hidden-empty', q.length > 0 && visible === 0 && sectionList.length > 0)
      })
      if (countEl) {
        countEl.textContent = q ? `${matched} / ${total}` : ''
      }
    }
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value
      clearTimeout(searchT)
      searchT = setTimeout(applyFilter, 80)
    })
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = ''
        state.searchQuery = ''
        applyFilter()
      }
    })
    // Run once on mount in case state.searchQuery survived a re-render.
    if (state.searchQuery) applyFilter()
  }

  // Section card click → edit section
  rootEl.querySelectorAll('.adm-card[data-kind]').forEach((el) => {
    el.addEventListener('click', () => openEdit(el.dataset.kind, el.dataset.id))
  })

  // Project row actions: edit, delete
  rootEl.querySelectorAll('.adm-row-main, .adm-row-action').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation()
      const action = el.dataset.action
      const id = el.dataset.id
      if (action === 'edit') openEdit('project', id)
      else if (action === 'delete') {
        const title = el.dataset.title || 'this project'
        if (!confirm(`Delete "${title}"?\n\nThis permanently removes it from Sanity. This can't be undone via /admin (you'd have to re-add it from Studio history).`)) return
        try {
          await deleteProject(id)
          await refreshLists()
          render()
        } catch (err) {
          alert('Delete failed: ' + err.message)
        }
      }
    })
  })

  // "+ Add project" buttons
  rootEl.querySelectorAll('.adm-add-project').forEach((el) => {
    el.addEventListener('click', async () => {
      const sectionSlug = el.dataset.sectionSlug
      const title = prompt(`New project title in "${sectionSlug}" section:`)
      if (!title) return
      try {
        const newProject = await createProject({sectionSlug, title})
        await refreshLists()
        // Open the edit view for the freshly created project
        openEdit('project', newProject._id)
      } catch (err) {
        alert('Create failed: ' + err.message)
      }
    })
  })

  // Drag-and-drop reorder per section
  rootEl.querySelectorAll('.adm-list[data-section-slug]').forEach(setupReorder)
}

async function openEdit(kind, id) {
  state.busy = true
  render()
  const doc = await loadDoc(kind, id)
  state.editing = {kind, id, doc}
  state.busy = false
  render()
}

/* Drag-reorder for project lists. On drop, syncs new order to Sanity. */
function setupReorder(list) {
  const sectionSlug = list.dataset.sectionSlug
  let dragging = null
  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.adm-row')
    if (!row) return
    dragging = row
    row.classList.add('adm-row-dragging')
    e.dataTransfer.effectAllowed = 'move'
  })
  list.addEventListener('dragend', () => {
    if (dragging) dragging.classList.remove('adm-row-dragging')
    dragging = null
  })
  list.addEventListener('dragover', (e) => {
    e.preventDefault()
    if (!dragging) return
    const target = e.target.closest('.adm-row')
    if (!target || target === dragging) return
    const rect = target.getBoundingClientRect()
    const after = (e.clientY - rect.top) > rect.height / 2
    target.parentNode.insertBefore(dragging, after ? target.nextSibling : target)
  })
  list.addEventListener('drop', async (e) => {
    e.preventDefault()
    if (!dragging) return
    const ids = Array.from(list.querySelectorAll('.adm-row')).map((r) => r.dataset.id)
    try {
      await reorderProjects(ids)
      // Update local state silently
      const projectsBySection = {}
      for (const p of state.projects) {
        const k = p.sectionSlug || 'unassigned'
        if (!projectsBySection[k]) projectsBySection[k] = []
        projectsBySection[k].push(p)
      }
      // Re-fetch lists after reorder
      await refreshLists()
    } catch (err) {
      alert('Reorder failed: ' + err.message + '\nReload and try again.')
    }
  })
}

function renderEdit() {
  const {kind, doc} = state.editing
  const isProject = kind === 'project'
  // Project page URL for live preview iframe (/<section-public-slug>/<project-slug>)
  // Map music → madplus per the public URL scheme
  const PUBLIC_SECTION = {music: 'madplus', originals: 'originals', bubble: 'bubble', vision: 'vision'}
  const previewUrl = isProject && doc.slug && doc.sectionSlug
    ? `/${PUBLIC_SECTION[doc.sectionSlug] || doc.sectionSlug}/${doc.slug}`
    : doc.slug
      ? `/${PUBLIC_SECTION[doc.slug?.current || doc.slug] || doc.slug?.current || doc.slug}`
      : '/'

  rootEl.innerHTML = `
    <div class="adm-shell adm-shell-edit">
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
        <div class="adm-topbar-actions">
          <button class="adm-link" id="adm-preview-reload" title="Reload preview">⟳ Reload preview</button>
          <a class="adm-link" href="${previewUrl}" target="_blank" rel="noopener">Open in new tab ↗</a>
        </div>
      </header>
      <div class="adm-split">
        <div class="adm-split-form">
          ${isProject ? renderProjectForm(doc) : renderSectionForm(doc)}
        </div>
        <div class="adm-split-preview">
          <div class="adm-preview-bar">
            <span class="adm-preview-label">LIVE PREVIEW</span>
            <span class="adm-preview-url">${escapeHtml(previewUrl)}</span>
          </div>
          <iframe
            class="adm-preview-frame"
            id="adm-preview-frame"
            src="${escapeAttr(previewUrl)}"
            title="Live preview"
            loading="lazy"
            allow="autoplay">
          </iframe>
          <div class="adm-preview-hint">
            Save changes → preview reloads. Live data via Sanity CDN cache (~60s).
          </div>
        </div>
      </div>
    </div>
  `
  rootEl.querySelector('#adm-back').addEventListener('click', () => {
    state.editing = null
    render()
  })
  const reloadBtn = rootEl.querySelector('#adm-preview-reload')
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      const f = rootEl.querySelector('#adm-preview-frame')
      if (f) f.src = f.src // force reload
    })
  }
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
            ? `<div class="adm-crop-wrap">
                 <div class="adm-crop-stage" id="adm-crop-stage">
                   <img class="adm-crop-img" id="adm-crop-img" src="${escapeAttr(p.coverImage.url)}?w=1400&auto=format" alt="Cover" draggable="false">
                   <div class="adm-crop-overlay" aria-hidden="true"></div>
                   <div class="adm-crop-rect" id="adm-crop-rect"
                        data-top="${p.coverImage.crop?.top ?? 0}"
                        data-left="${p.coverImage.crop?.left ?? 0}"
                        data-right="${p.coverImage.crop?.right ?? 0}"
                        data-bottom="${p.coverImage.crop?.bottom ?? 0}">
                     <div class="adm-crop-handle adm-crop-handle-tl" data-handle="tl"></div>
                     <div class="adm-crop-handle adm-crop-handle-tr" data-handle="tr"></div>
                     <div class="adm-crop-handle adm-crop-handle-bl" data-handle="bl"></div>
                     <div class="adm-crop-handle adm-crop-handle-br" data-handle="br"></div>
                     <div class="adm-crop-grid" aria-hidden="true"></div>
                   </div>
                 </div>
                 <div class="adm-crop-controls">
                   <span class="adm-crop-zoom-label">ZOOM</span>
                   <input type="range" class="adm-crop-zoom" id="adm-crop-zoom" min="0.3" max="1" step="0.01" value="1" title="Smaller = zoomed in further">
                   <span class="adm-crop-percent" id="adm-crop-percent">100%</span>
                 </div>
                 <div class="adm-crop-hint">Drag the rectangle to position · drag corners to resize · slider to zoom in</div>
               </div>`
            : '<div class="adm-cover-empty">No cover yet — drop or click to upload</div>'}
          <div class="adm-cover-actions">
            <label class="adm-cover-btn">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden id="adm-cover-input">
              <span>${p.coverImage?.url ? 'Replace cover ↑' : 'Upload cover ↑'}</span>
            </label>
            ${p.coverImage?.url ? '<button type="button" class="adm-link adm-cover-remove">Remove</button>' : ''}
            ${p.coverImage?.url ? '<button type="button" class="adm-link adm-crop-reset" id="adm-crop-reset">Reset crop</button>' : ''}
          </div>
          <div class="adm-cover-status" id="adm-cover-status"></div>
        </div>
      </fieldset>

      <fieldset class="adm-fields adm-fields-gallery">
        <legend>Project gallery (${(p.media || []).length} items)</legend>
        <div class="adm-gallery-hint">
          Drag to reorder · click × to remove · add images or videos at the end
        </div>
        <div class="adm-gallery-grid" id="adm-gallery-grid">
          ${(p.media || []).map((m, i) => renderGalleryThumb(m, i)).join('')}
          <label class="adm-gallery-add">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden id="adm-gallery-input" multiple>
            <span class="adm-gallery-add-icon" aria-hidden="true">+</span>
            <span class="adm-gallery-add-label">Add images</span>
          </label>
          <label class="adm-gallery-add adm-gallery-add-video">
            <input type="file" accept="video/mp4,video/quicktime,video/webm,video/mov,video/*" hidden id="adm-gallery-video-input">
            <span class="adm-gallery-add-icon" aria-hidden="true">▶</span>
            <span class="adm-gallery-add-label">Add video</span>
          </label>
        </div>
        <div class="adm-cover-status" id="adm-gallery-status"></div>
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

/* COVER IMAGE — upload, remove, draggable + resizable crop rectangle.
   The rectangle is locked to a 16:10 aspect ratio (matches the public
   cover render). User drags it to position what they want centered,
   drags corner handles to resize, or uses the zoom slider for quick
   sizing. On save, rect's position relative to the natural image
   dimensions is converted to Sanity crop {top, bottom, left, right}. */
function bindCoverUpload(projectId) {
  const input = rootEl.querySelector('#adm-cover-input')
  const status = rootEl.querySelector('#adm-cover-status')
  const zone = rootEl.querySelector('.adm-cover-zone')
  const removeBtn = rootEl.querySelector('.adm-cover-remove')
  if (!input || !zone) return

  // Reset crop state — initialised in attachCropTool from rect's data-* attrs
  cropState = null

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    status.textContent = `Uploading ${file.name}…`
    try {
      const asset = await uploadFile(file)
      coverState = {assetId: asset._id, url: asset.url}
      cropState = {top: 0, left: 0, right: 0, bottom: 0}
      // Replace cover area with the crop tool
      const wrap = zone.querySelector('.adm-crop-wrap, .adm-cover-empty')
      if (wrap) wrap.outerHTML = makeCropToolHTML(asset.url + '?w=1400&auto=format', cropState)
      attachCropTool()
      status.textContent = '✓ Uploaded — drag the rect to crop, then save'
    } catch (err) {
      status.textContent = '✗ ' + err.message
    }
  })

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      coverState = {remove: true}
      cropState = null
      const wrap = zone.querySelector('.adm-crop-wrap')
      if (wrap) wrap.replaceWith(Object.assign(document.createElement('div'), {
        className: 'adm-cover-empty', textContent: 'Cover removed (will save when you click "Save changes")',
      }))
      removeBtn.remove()
      const reset = rootEl.querySelector('#adm-crop-reset')
      if (reset) reset.remove()
      status.textContent = 'Cover marked for removal'
    })
  }

  attachCropTool()
}

function makeCropToolHTML(imgUrl, crop = {top: 0, left: 0, right: 0, bottom: 0}) {
  return `
    <div class="adm-crop-wrap">
      <div class="adm-crop-stage" id="adm-crop-stage">
        <img class="adm-crop-img" id="adm-crop-img" src="${escapeAttr(imgUrl)}" alt="Cover" draggable="false">
        <div class="adm-crop-overlay" aria-hidden="true"></div>
        <div class="adm-crop-rect" id="adm-crop-rect"
             data-top="${crop.top}" data-left="${crop.left}" data-right="${crop.right}" data-bottom="${crop.bottom}">
          <div class="adm-crop-handle adm-crop-handle-tl" data-handle="tl"></div>
          <div class="adm-crop-handle adm-crop-handle-tr" data-handle="tr"></div>
          <div class="adm-crop-handle adm-crop-handle-bl" data-handle="bl"></div>
          <div class="adm-crop-handle adm-crop-handle-br" data-handle="br"></div>
          <div class="adm-crop-grid" aria-hidden="true"></div>
        </div>
      </div>
      <div class="adm-crop-controls">
        <span class="adm-crop-zoom-label">ZOOM</span>
        <input type="range" class="adm-crop-zoom" id="adm-crop-zoom" min="0.3" max="1" step="0.01" value="1">
        <span class="adm-crop-percent" id="adm-crop-percent">100%</span>
      </div>
      <div class="adm-crop-hint">Drag the rectangle to position · drag corners to resize · slider to zoom in</div>
    </div>
  `
}

/* Crop rectangle drag/resize logic. Rect coords stored as fractions of
   the image's natural dimensions: {x, y, w, h} where (x,y) is top-left
   and (w,h) are size, all 0-1. Aspect ratio LOCKED to 16:10 = 1.6 to
   match the public cover render. On save, converts to Sanity crop
   {top, bottom, left, right} where each value is the fraction CHOPPED
   from that edge.

   Visual: the overlay darkens everything outside the rect via the
   .adm-crop-rect's box-shadow trick (large blackout shadow projected
   outwards covers the rest of the stage). */
const CROP_ASPECT = 16 / 10

function attachCropTool() {
  const stage = rootEl.querySelector('#adm-crop-stage')
  const img = rootEl.querySelector('#adm-crop-img')
  const rect = rootEl.querySelector('#adm-crop-rect')
  const zoomSlider = rootEl.querySelector('#adm-crop-zoom')
  const percentEl = rootEl.querySelector('#adm-crop-percent')
  const status = rootEl.querySelector('#adm-cover-status')
  const resetBtn = rootEl.querySelector('#adm-crop-reset')
  if (!stage || !img || !rect) return

  // Internal state in fractions of the image's BOUNDING BOX (which equals
  // its natural aspect ratio scaled to fit the stage). x,y = top-left of
  // crop rect; w,h = size. All 0..1.
  let cx, cy, cw, ch

  const initFromExisting = () => {
    const top = parseFloat(rect.dataset.top) || 0
    const left = parseFloat(rect.dataset.left) || 0
    const right = parseFloat(rect.dataset.right) || 0
    const bottom = parseFloat(rect.dataset.bottom) || 0
    if (top || left || right || bottom) {
      cx = left
      cy = top
      cw = 1 - left - right
      ch = 1 - top - bottom
    } else {
      // No existing crop — default rect = largest 16:10 area inside the image
      defaultRect()
    }
  }

  const defaultRect = () => {
    if (!img.naturalWidth) {
      // fallback if natural dims not yet known — assume image native equals 16:10
      cx = 0; cy = 0; cw = 1; ch = 1
      return
    }
    const imgAspect = img.naturalWidth / img.naturalHeight
    if (imgAspect >= CROP_ASPECT) {
      // Image wider than 16:10 — full height, narrower width centered
      ch = 1
      cw = (CROP_ASPECT / imgAspect)
      cx = (1 - cw) / 2
      cy = 0
    } else {
      // Image taller than 16:10 — full width, shorter height centered
      cw = 1
      ch = (imgAspect / CROP_ASPECT)
      cx = 0
      cy = (1 - ch) / 2
    }
  }

  const apply = () => {
    rect.style.left = (cx * 100) + '%'
    rect.style.top = (cy * 100) + '%'
    rect.style.width = (cw * 100) + '%'
    rect.style.height = (ch * 100) + '%'
    cropState = {
      top: clamp01(cy),
      left: clamp01(cx),
      right: clamp01(1 - cx - cw),
      bottom: clamp01(1 - cy - ch),
    }
    if (status) status.textContent = `Crop: ${Math.round(cw * 100)}% × ${Math.round(ch * 100)}% — click Save to apply`
    if (percentEl) percentEl.textContent = Math.round(cw * 100) + '%'
    if (zoomSlider) zoomSlider.value = cw
  }

  const setSize = (newW) => {
    // Resize keeping the rect centered on its current center
    const cxOld = cx + cw / 2
    const cyOld = cy + ch / 2
    cw = Math.max(0.15, Math.min(1, newW))
    // Maintain visual aspect 16:10 within the image's container box.
    // CROP_ASPECT is the ratio of (cw_in_pixels)/(ch_in_pixels). Since
    // cw and ch are in fractions of imgWidth/imgHeight (different units),
    // the rect's pixel aspect = (cw * imgWidth) / (ch * imgHeight)
    // For pixel aspect = CROP_ASPECT: ch = (cw * imgWidth) / (CROP_ASPECT * imgHeight)
    const imgAspect = img.naturalWidth / img.naturalHeight || CROP_ASPECT
    ch = (cw * imgAspect) / CROP_ASPECT
    if (ch > 1) {
      // height capped; recompute cw from ch
      ch = 1
      cw = (CROP_ASPECT * ch) / imgAspect
    }
    // Re-center
    cx = clamp01(cxOld - cw / 2)
    cy = clamp01(cyOld - ch / 2)
    if (cx + cw > 1) cx = 1 - cw
    if (cy + ch > 1) cy = 1 - ch
    apply()
  }

  // Initial setup once image dims are known
  const init = () => {
    initFromExisting()
    apply()
  }
  if (img.complete && img.naturalWidth) init()
  else img.addEventListener('load', init, {once: true})

  /* DRAG to move the rect */
  let dragMode = null // 'move' or one of 'tl','tr','bl','br'
  let dragStart = null

  const onPointerMove = (e) => {
    if (!dragMode) return
    e.preventDefault()
    const stageRect = stage.getBoundingClientRect()
    const cx2 = (e.touches ? e.touches[0].clientX : e.clientX) - stageRect.left
    const cy2 = (e.touches ? e.touches[0].clientY : e.clientY) - stageRect.top
    const fx = clamp01(cx2 / stageRect.width)
    const fy = clamp01(cy2 / stageRect.height)
    if (dragMode === 'move') {
      cx = clamp01(dragStart.cx + (fx - dragStart.fx))
      cy = clamp01(dragStart.cy + (fy - dragStart.fy))
      if (cx + cw > 1) cx = 1 - cw
      if (cy + ch > 1) cy = 1 - ch
    } else {
      // Resize from a corner — anchor opposite corner, recompute new rect
      // with aspect ratio locked.
      const imgAspect = img.naturalWidth / img.naturalHeight || CROP_ASPECT
      const anchor = {
        tl: {x: dragStart.cx + dragStart.cw, y: dragStart.cy + dragStart.ch},
        tr: {x: dragStart.cx,                y: dragStart.cy + dragStart.ch},
        bl: {x: dragStart.cx + dragStart.cw, y: dragStart.cy},
        br: {x: dragStart.cx,                y: dragStart.cy},
      }[dragMode]
      let newW = Math.abs(fx - anchor.x)
      // Aspect-locked height: ch = newW * imgAspect / CROP_ASPECT
      let newH = (newW * imgAspect) / CROP_ASPECT
      // Bound to stage
      if (newW < 0.15) newW = 0.15
      if (newH > 1) {
        newH = 1
        newW = (CROP_ASPECT * newH) / imgAspect
      }
      // Determine new top-left based on anchor + handle direction
      cw = newW
      ch = newH
      if (dragMode.includes('l')) cx = anchor.x - newW
      else cx = anchor.x
      if (dragMode.includes('t')) cy = anchor.y - newH
      else cy = anchor.y
      cx = clamp01(cx); cy = clamp01(cy)
      if (cx + cw > 1) cx = 1 - cw
      if (cy + ch > 1) cy = 1 - ch
    }
    apply()
  }
  const onPointerUp = () => {
    dragMode = null
    document.removeEventListener('mousemove', onPointerMove)
    document.removeEventListener('touchmove', onPointerMove)
    document.removeEventListener('mouseup', onPointerUp)
    document.removeEventListener('touchend', onPointerUp)
  }
  const startDrag = (mode) => (e) => {
    e.preventDefault()
    dragMode = mode
    const stageRect = stage.getBoundingClientRect()
    const cx2 = (e.touches ? e.touches[0].clientX : e.clientX) - stageRect.left
    const cy2 = (e.touches ? e.touches[0].clientY : e.clientY) - stageRect.top
    dragStart = {fx: cx2 / stageRect.width, fy: cy2 / stageRect.height, cx, cy, cw, ch}
    document.addEventListener('mousemove', onPointerMove, {passive: false})
    document.addEventListener('touchmove', onPointerMove, {passive: false})
    document.addEventListener('mouseup', onPointerUp)
    document.addEventListener('touchend', onPointerUp)
  }

  // Bind drag on the rect body (move) and corners (resize)
  rect.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('adm-crop-handle')) return
    startDrag('move')(e)
  })
  rect.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('adm-crop-handle')) return
    startDrag('move')(e)
  }, {passive: false})
  rect.querySelectorAll('.adm-crop-handle').forEach((h) => {
    h.addEventListener('mousedown', startDrag(h.dataset.handle))
    h.addEventListener('touchstart', startDrag(h.dataset.handle), {passive: false})
  })

  // Zoom slider — sets crop width directly
  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      setSize(parseFloat(e.target.value))
    })
  }

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      defaultRect()
      apply()
    })
  }
}

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0))
}

/* GALLERY — add/remove/reorder + video upload via Mux */
function bindGallery(projectId) {
  const grid = rootEl.querySelector('#adm-gallery-grid')
  const input = rootEl.querySelector('#adm-gallery-input')
  const videoInput = rootEl.querySelector('#adm-gallery-video-input')
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

  // Add new video via Mux direct upload
  if (videoInput) {
    videoInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      status.textContent = `Preparing upload for ${file.name}…`
      try {
        // Step 1: get Mux upload URL
        const initR = await fetch(API.videoInit, {method: 'POST', credentials: 'same-origin'})
        const init = await initR.json()
        if (!initR.ok || !init.ok) throw new Error(init.error || 'Mux init failed')

        // Step 2: PUT the file to Mux directly
        status.textContent = `Uploading ${file.name} to Mux…`
        await xhrUpload(init.uploadUrl, file, (pct) => {
          status.textContent = `Uploading ${file.name}: ${Math.round(pct)}%`
        })

        // Step 3: poll for processing + Sanity wrapping
        status.textContent = `Mux is transcoding ${file.name} (~30s)…`
        const finR = await fetch(`${API.videoFinalize}?uploadId=${encodeURIComponent(init.uploadId)}`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        const fin = await finR.json()
        if (!finR.ok || !fin.ok) throw new Error(fin.error || 'Mux finalize failed')

        // Add as videoItem to mediaState
        mediaState.push({
          _type: 'videoItem',
          _key: fin._key,
          video: {
            _type: 'mux.video',
            asset: {_type: 'reference', _ref: fin.videoAsset._id},
          },
          caption: '',
          autoplay: true,
        })
        status.textContent = `✓ Video processed — click "Save changes" to apply`
        reRenderGallery()
      } catch (err) {
        status.textContent = '✗ Video upload failed: ' + err.message
      }
      videoInput.value = ''
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
      status.textContent = '✓ Saved — reloading preview…'
      await refreshLists()
      // Reload the preview iframe so user sees new content immediately
      // (small delay to give Sanity CDN a moment to invalidate)
      setTimeout(() => {
        const f = rootEl.querySelector('#adm-preview-frame')
        if (f) f.src = f.src
        status.textContent = '✓ Saved. Preview reloaded.'
      }, 800)
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
  // Cover image — include if user uploaded a new one OR moved crop OR removed it
  if (coverState && coverState.remove) {
    payload.coverImage = null
  } else if (coverState && coverState.assetId) {
    payload.coverImage = {
      assetId: coverState.assetId,
      ...(cropState ? {crop: cropState} : {}),
    }
  } else if (cropState) {
    // Crop changed on existing cover — re-send existing assetId + new crop
    const currentAssetId = rootEl.querySelector('.adm-cover-zone')?.dataset.coverCurrent
    if (currentAssetId) {
      payload.coverImage = {assetId: currentAssetId, crop: cropState}
    }
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
/* While admin is open: hide the custom site cursor (the dot + "VIEW" pill)
   and use the normal OS cursor everywhere. Keeps the admin feeling like a
   regular app — pencils into inputs, click on buttons, no editorial flair. */
body:has(.admin-root.open) .cursor,
body.is-admin .cursor{display:none !important}
body:has(.admin-root.open),
body.is-admin,
.admin-root *{cursor:auto}
.admin-root button,
.admin-root .adm-row-handle,
.admin-root [role="button"],
.admin-root label.adm-cover-btn,
.admin-root .adm-gallery-add,
.admin-root .adm-link{cursor:pointer}
.admin-root input,
.admin-root textarea{cursor:text}
.admin-root .adm-crop-rect{cursor:move}
.admin-root .adm-crop-zoom{cursor:pointer}
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
.adm-dim{opacity:0.5}
.adm-section-block.is-hidden-empty{display:none}

/* SEARCH */
.adm-search-wrap{
  position:relative;display:flex;align-items:center;gap:0.7rem;
  background:#161310;border:0.08rem solid rgba(245,240,225,0.1);
  border-radius:0.8rem;padding:0.4rem 0.9rem;
  margin-bottom:0.5rem;
  transition:border-color 0.2s ease, background 0.2s ease;
}
.adm-search-wrap:focus-within{
  border-color:rgba(245,240,225,0.35);background:#1A1714;
}
.adm-search-label{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;flex-shrink:0;
}
.adm-search{
  flex:1;background:transparent;border:none;outline:none;
  color:#F5F0E1;font-family:inherit;font-size:1rem;
  padding:0.7rem 0;min-width:0;
}
.adm-search::placeholder{color:rgba(245,240,225,0.35)}
.adm-search::-webkit-search-cancel-button{
  -webkit-appearance:none;appearance:none;
  width:1rem;height:1rem;cursor:pointer;
  background:rgba(245,240,225,0.4);
  mask:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/></svg>") center/contain no-repeat;
}
.adm-search-count{
  font-family:'IBM Plex Mono',monospace;font-size:0.78rem;
  letter-spacing:0.06em;opacity:0.55;flex-shrink:0;
  font-variant-numeric:tabular-nums;
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
.adm-section-head{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:1.2rem;
}
.adm-add-project{
  background:transparent;border:0.08rem solid rgba(245,240,225,0.2) !important;
  padding:0.4rem 0.95rem !important;border-radius:999px;
  font-size:0.7rem !important;
  transition:background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.adm-add-project:hover{
  background:#D0FA51 !important;color:#1A1815 !important;
  border-color:transparent !important;opacity:1 !important;
}

.adm-list{display:flex;flex-direction:column;gap:0.4rem}
.adm-row{
  display:flex;align-items:center;gap:0.6rem;
  padding:0.85rem 1rem;
  background:#161310;border:0.08rem solid rgba(245,240,225,0.08);
  border-radius:0.6rem;
  font-family:inherit;color:#F5F0E1;text-align:left;
  transition:background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.adm-row:hover{background:#23201B;border-color:rgba(245,240,225,0.18)}
.adm-row-handle{
  cursor:grab;opacity:0.4;
  font-size:1.1rem;line-height:1;
  padding:0 0.4rem;user-select:none;
  transition:opacity 0.2s ease;
}
.adm-row:hover .adm-row-handle{opacity:0.8}
.adm-row-handle:active{cursor:grabbing}
.adm-row-dragging{opacity:0.5;border-color:#D0FA51 !important;transform:scale(0.98)}

.adm-row-main{
  flex:1;min-width:0;
  display:flex;justify-content:space-between;align-items:center;gap:0.8rem;
  background:transparent;border:0;cursor:pointer;
  font-family:inherit;color:inherit;text-align:left;
  padding:0.2rem 0;
}
.adm-row-title{font-weight:500;font-size:1rem;letter-spacing:-0.01em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adm-row-meta{display:flex;gap:0.4rem;align-items:center;flex-shrink:0}
.adm-row-action{
  background:transparent;border:0;cursor:pointer;
  color:#F5F0E1;flex-shrink:0;
  padding:0.4rem 0.7rem;border-radius:0.4rem;
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;
  transition:opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.adm-row:hover .adm-row-action{opacity:0.85}
.adm-row-edit-btn:hover{color:#D0FA51;opacity:1 !important}
.adm-row-delete-btn{font-size:1.1rem !important;letter-spacing:0 !important;padding:0.2rem 0.55rem !important;line-height:1 !important}
.adm-row-delete-btn:hover{background:#FF5577;color:#fff;opacity:1 !important}
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

/* SPLIT PANE — edit form left, live iframe preview right */
.adm-shell-edit{max-width:none;padding:1.2rem 1.5rem 0;height:100vh;display:flex;flex-direction:column}
.adm-split{
  display:grid;
  grid-template-columns:minmax(28rem, 38%) 1fr;
  gap:1.2rem;
  flex:1;min-height:0;
  margin-bottom:1.5rem;
}
.adm-split-form{
  overflow-y:auto;
  padding-right:0.5rem;
  /* hide native scrollbar but keep functional */
  scrollbar-width:thin;
}
.adm-split-form::-webkit-scrollbar{width:6px}
.adm-split-form::-webkit-scrollbar-thumb{background:rgba(245,240,225,0.15);border-radius:3px}
.adm-split-preview{
  display:flex;flex-direction:column;
  background:#0A0A0A;
  border:0.08rem solid rgba(245,240,225,0.1);
  border-radius:0.8rem;
  overflow:hidden;
  min-height:0;
}
.adm-preview-bar{
  display:flex;align-items:center;gap:0.8rem;
  padding:0.7rem 1rem;
  background:#161310;
  border-bottom:0.08rem solid rgba(245,240,225,0.08);
}
.adm-preview-label{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.22em;text-transform:uppercase;
  color:#D0FA51;
}
.adm-preview-url{
  font-family:'IBM Plex Mono',monospace;font-weight:400;
  font-size:0.78rem;
  color:#F5F0E1;opacity:0.6;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.adm-preview-frame{
  flex:1;width:100%;border:0;
  background:#0A0A0A;
  min-height:0;
}
.adm-preview-hint{
  padding:0.6rem 1rem;
  background:#161310;
  border-top:0.08rem solid rgba(245,240,225,0.06);
  font-family:'Newsreader',serif;font-style:italic;
  font-size:0.78rem;opacity:0.55;
}

/* Stack on narrow widths */
@media (max-width: 1100px){
  .adm-shell-edit{height:auto;padding:1rem 1.25rem 5rem}
  .adm-split{grid-template-columns:1fr;gap:1.5rem}
  .adm-split-form{overflow:visible;padding-right:0}
  .adm-split-preview{height:60vh}
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
/* CROP TOOL — draggable + resizable rectangle on the original image */
.adm-crop-wrap{
  display:flex;flex-direction:column;gap:0.8rem;
  max-width:36rem;
}
.adm-crop-stage{
  position:relative;
  width:100%;max-height:30rem;
  background:#0A0A0A;
  border-radius:0.6rem;
  overflow:hidden;
  border:0.08rem solid rgba(245,240,225,0.1);
  user-select:none;
}
.adm-crop-img{
  width:100%;height:auto;display:block;
  pointer-events:none; /* drag goes to the rect, not the image */
  user-select:none;
}
/* Dim everything outside the crop rect */
.adm-crop-overlay{
  position:absolute;inset:0;
  background:rgba(10,10,10,0.6);
  pointer-events:none;
  z-index:1;
}
/* The crop rectangle. Box-shadow of the rect "punches a hole" by being
   the only fully-bright area; combined with .adm-crop-overlay, only the
   inside of the rect is unobscured. */
.adm-crop-rect{
  position:absolute;
  border:0.12rem solid #D0FA51;
  cursor:move;
  z-index:2;
  /* Inverse highlight: clear inside, fade everything else (via overlay above) */
  box-shadow:0 0 0 9999px rgba(10,10,10,0.55);
  /* Subtract from overlay so inside stays bright */
  -webkit-mask:none;
}
.adm-crop-rect::before{
  /* Carve out the rect area from the overlay */
  content:'';
  position:absolute;inset:0;
  background:transparent;
  /* uses sibling overlay to dim — the rect itself is just border */
}
/* Override: cleaner approach — use a pseudo overlay on stage, no shadow */
.adm-crop-overlay{display:none}
.adm-crop-rect{
  box-shadow:0 0 0 9999px rgba(10,10,10,0.55);
}
.adm-crop-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(to right, transparent 33.3%, rgba(245,240,225,0.25) 33.3%, rgba(245,240,225,0.25) 33.5%, transparent 33.5%, transparent 66.6%, rgba(245,240,225,0.25) 66.6%, rgba(245,240,225,0.25) 66.8%, transparent 66.8%),
    linear-gradient(to bottom, transparent 33.3%, rgba(245,240,225,0.25) 33.3%, rgba(245,240,225,0.25) 33.5%, transparent 33.5%, transparent 66.6%, rgba(245,240,225,0.25) 66.6%, rgba(245,240,225,0.25) 66.8%, transparent 66.8%);
  pointer-events:none;
}
.adm-crop-handle{
  position:absolute;
  width:1rem;height:1rem;
  background:#D0FA51;
  border:0.12rem solid #0A0A0A;
  border-radius:50%;
  z-index:3;
}
.adm-crop-handle-tl{top:-0.5rem;left:-0.5rem;cursor:nwse-resize}
.adm-crop-handle-tr{top:-0.5rem;right:-0.5rem;cursor:nesw-resize}
.adm-crop-handle-bl{bottom:-0.5rem;left:-0.5rem;cursor:nesw-resize}
.adm-crop-handle-br{bottom:-0.5rem;right:-0.5rem;cursor:nwse-resize}

.adm-crop-controls{
  display:flex;align-items:center;gap:0.8rem;
}
.adm-crop-zoom-label,.adm-crop-percent{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;
  opacity:0.55;
}
.adm-crop-percent{min-width:3rem;text-align:right;color:#D0FA51;opacity:0.85}
.adm-crop-zoom{
  flex:1;
  -webkit-appearance:none;appearance:none;
  height:0.3rem;
  background:rgba(245,240,225,0.1);
  border-radius:999px;
  cursor:pointer;
}
.adm-crop-zoom::-webkit-slider-thumb{
  -webkit-appearance:none;
  width:1.2rem;height:1.2rem;border-radius:50%;
  background:#D0FA51;border:0.12rem solid #0A0A0A;
  cursor:grab;
}
.adm-crop-zoom::-moz-range-thumb{
  width:1.2rem;height:1.2rem;border-radius:50%;
  background:#D0FA51;border:0.12rem solid #0A0A0A;
  cursor:grab;
}
.adm-crop-hint{
  font-family:'IBM Plex Mono',monospace;font-weight:500;
  font-size:0.65rem;letter-spacing:0.14em;text-transform:uppercase;
  opacity:0.5;
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
.adm-gallery-add-video:hover{
  border-color:#FF5577;color:#FF5577;
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
