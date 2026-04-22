import {fetchContent, urlFor} from './sanity-client.js'
import '@mux/mux-player'

/* ─── NAV CARD ICONS (not yet in Sanity, kept inline) ──────────────────────── */
const ICONS = {
  originals: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64.15 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M397.04,127.31c-5.99,3.03-7.95,6.02-10.64,11.82l-7.56,16.29c-2.38,5.14-5.22,9.81-8.34,14.49c-2.67,3.99-3.06,8.75-1.33,13.17c1.85,4.73,5.63,6.54,10.52,7.28c0.89,0.13,1.42,0.71,1.3,1.54c-0.12,0.78-0.85,1.29-1.7,1.12c-2.27-0.45-4.46-0.94-6.51-2.02c-2.78-1.46-4.8-3.82-6.01-6.73c-2.19-5.29-1.56-11.23,1.63-16.04c3.41-5.13,6.33-10.31,8.95-15.91l8.11-17.37c1.14-2.45,2.81-4.58,4.78-6.34c1.9-1.69,4.06-2.86,6.29-4.03l9.59-4.99c0.7-0.36,1.21-1.15,1.73-1.7l1.7-1.8c-0.99-1.02-1.97-2.23-2.49-3.65c-0.81-2.18-1.81-4.22-2.41-6.48c-0.94-3.55,0.07-7.34-1.46-11.47c-0.82-2.21-1.03-4.45-0.72-6.85l-1.89-0.71c-5.69-1.83-10.87-4.73-15.22-8.82c-3.69-3.47-7.3-8.39-7.19-13.52c0.05-2.09,1.12-4.07,3.06-4.89c3.24-1.37,6.56,1.32,9.33,3.48c3.5,2.74,7.45,4.58,11.93,5.23l2.33-7.56c1.26-4.08,2.42-8.04,3.95-12.01c0.72-1.71,1.44-3.3,2.57-4.72c1.83-2.31,4.93-2.67,7.27-0.88c3.71,2.84,5.88-1.48,10.01-1.63c2.05-0.07,4.07,0.67,5.78,1.8l7.89,5.25c2.09,1.51,3.62,3.59,3.95,6.19l0.79,6.14c3.91-1.07,7.9-1.35,11.91-0.67c7.95,1.36,13.81,8.38,11.46,16.39c-0.59,2.02-1.64,3.83-3,5.48c-4.66,5.66-11.97,8.58-19.12,9.5c-0.99,2.22-2.15,4.31-4.01,5.77c-0.55,0.43-0.98,0.77-1.22,1.45c-0.89,3.04-1.25,6.15-1.06,9.27c0.67,0.42,1.38,0.9,1.83,1.46l2.86,3.64c0.63,0.8,1.06,1.68,1.33,2.74l9.69,6.65l9.68,6.9c2.37,1.69,5.03,5.65,6.13,8.45c2.57,6.52,3.88,13.36,3.88,20.45l0.03,39.41c0,3.96-3,7.22-7.04,7.22l-60.29,0.02c-0.56,0-1.22-0.54-1.22-1.07l-0.03-24.53l0.3-6.48l-3.97-9.18l-7.98-18.69c-0.21-0.5-0.1-1.28,0.23-1.66l5.11-5.88l-4.7-2.22c-0.84-0.4-1-1.37-0.51-2.12l5.86-9.09L397.04,127.31z"/></svg>`,
  bubble: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="516.1 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M849.32,172.63c-3.91,8.12-5.36,16.83-5.13,25.69c0.03,1-0.67,1.54-1.61,1.54l-19.41,0c-0.84,0-1.48-0.68-1.44-1.54c0.74-17.22,3.61-36.78,10.82-52.49c3.42-7.44,8.01-14.14,13.98-19.7l2.68-2.29c-0.12-3.36-0.7-6.74-1.65-10.03l-1.27-3.36c-5.45,1.1-10.74-0.17-13.36-5.25c-2.01-3.92-3.6-7.97-4.75-12.25c-0.99-3.69-1.04-7.47-0.13-11.13c0.29-1.18,0.39-2.2,0.11-3.37c-0.39-1.62-0.4-3.22-0.31-4.91c0.46-1.78,0.99-3.45,1.62-5.12c-0.33-1.33-0.31-2.68,0.03-4c0.93-3.12,2.6-5.75,4.68-8.21c4.11-4.85,9.38-7.66,15.82-8.42c2.99-2.63,6.78-4.1,10.86-4.36c6.32-6.37,16.32-5.4,23.66-1.1c4.79,2.81,10.9,9.66,12.07,14.7l3.36,14.55l14.3,64.82c0.79,3.6-0.59,6.9-4.62,7.68l-4.73,0.35c0.96,2.86,0.03,5.56-2.64,6.77c3.81,11.1,6.33,22.41,7.99,34.03l1.5,12.83c0.11,0.98-0.44,1.81-1.53,1.81l-15.41-0.01c-0.68,0-1.29-0.6-1.31-1.25c-0.46-13-1.99-29.05-10.41-39.41c-4.05-4.99-9.82-8.38-16.29-9.08c-5.37-0.58-10.59,0.92-15.08,3.76c-7.96,5.02-13.12,13.79-16.76,22.36c-2.76,6.75-4.64,13.67-5.92,20.91l12.4,0c0.09-3.85,0.25-7.55,0.96-11.3c0.83-4.95,2.23-9.55,4.41-14.04c0.31-0.6,0.98-0.85,1.52-0.75C848.76,171.14,849.63,171.97,849.32,172.63z"/></svg>`,
  music: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="968.05 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M1393.24,136.47l-3.1,1.62l1.02,1.78c0.39,0.68,0.33,1.57-0.24,1.97c-0.73,0.51-1.71,0.33-2.16-0.44l-1.17-1.98l-3.12,1.62l1.09,1.88c0.37,0.64,0.21,1.53-0.34,1.91c-0.64,0.44-1.63,0.36-2.06-0.38l-1.17-1.99c-0.65,0.31-1.39,0.66-1.96,0.62l-4.66-0.32l-4.51,2.62l0.43,6.93l-0.15,39.7c-0.01,3.43-3.5,6.42-6.9,6.43l-47.11,0.08c-0.95,0.51-1.81,0.65-2.94,0.55c-3.81,6.58-10.26,11.27-18.02,11.92c-4.9,0.41-9.57-1.49-13.27-4.57c-6.28-5.22-10.5-13.4-13.2-21.05c-5.25-0.19-9.33-1.57-12.85-5.48c-1.33-1.93-2.3-3.94-2.91-6.21c-2.28-10.61,4.44-19.02,13.32-24.2c1.46-13.37,5.77-25.74,16.68-34.17l0.99-21.54l1.29-27.64c0.31-4.59,2.45-8.4,5.53-11.72c0.75-1.53,1.39-3.19,2.26-4.73c2.42-4.29,6.04-7.52,10.71-9.31c8.73-3.35,18.74-1.57,25.75,4.62c3.54,3.13,5.99,6.95,7.59,11.36c1.35,3.72,1.82,7.37,2.3,11.32l3.81,31.05c0.19,1.51,0.55,2.75,1.35,4l6.82,10.64c3.87,2.45,6.97,5.57,9.69,9.23l2.78,4.25c1.5,2.29,2.45,4.69,3.36,7.32l1.7-0.94l2.06-4.19c0.31-0.62,1.15-1.16,1.79-1.63l-1.14-2c-0.35-0.61,0.03-1.55,0.53-1.84c0.74-0.43,1.59-0.12,2,0.61l1.01,1.77l2.98-1.87l-1.1-1.94c-0.41-0.72-0.1-1.61,0.59-1.99c0.72-0.4,1.55-0.11,2.01,0.7l0.94,1.64l3-1.87l-1.03-1.68c-0.38-0.63-0.31-1.44,0.15-1.89c0.49-0.47,1.57-0.58,1.95,0l1.32,2l1.41-0.81c0.87-0.5,2.32-0.78,3.17-0.04l3.96,3.48c1.31,1.15,2.05,2.57,2.37,4.25l0.95,5.02c0.22,1.19-0.07,2.55-1.2,3.18l-1.81,1.01l1.04,1.83c0.34,0.59,0.1,1.41-0.43,1.79c-0.49,0.34-1.52,0.32-1.9-0.29L1393.24,136.47z"/></svg>`,
  vision: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1420.01 30.79 435.85 118.45" preserveAspectRatio="xMidYMid meet"><path fill="currentColor" d="M1696.14,125.95c0.61-0.92,1.68-1.82,3.08-1.82l38.34,0c1.94,0,3.7,1.13,4.39,2.94l6.99,18.24l0.82-8c0.76-14.3,7.28-27.57,18.26-36.74c2.26-1.89,4.51-3.56,7.18-5.04c-3.63-2.35-5.31-5.83-5.88-10.13c-7.73-4.36-12.96-13.18-8.03-21.3c-2.44-3.85-3.01-8.83-1.04-12.88c2.88-5.93,9.88-9.01,16.28-10.06c8.32-1.35,16.73-0.26,24.55,2.86c3.54,1.41,6.69,3.22,9.6,5.61c2.51,2.05,4.54,4.41,5.98,7.28c2.68,5.35,1.52,11.42-2.83,15.49c2.51,7.17-1.14,13.18-7.41,16.39c4.09,0.46,7.79,1.28,11.44,2.94c9.48,4.33,16.84,12.36,19.87,22.39c0.9,2.98,1.7,6,1.7,9.18l0.05,55.56c0,4.25-3.63,8.25-7.99,8.26l-113.23,0.03c-0.78,0-1.35-0.72-1.38-1.36c-0.29-5.12,1.8-10,5.82-13.27l-8.73-0.08c-2.59-0.02-4.3-2.61-4.25-5.08c0.01-0.63,0.17-1.54-0.05-2.11l-13.59-35.48C1695.53,128.31,1695.31,127.22,1696.14,125.95z"/></svg>`,
}

/* ─── Helpers to resolve image/video URLs from Sanity media items ──────── */
function mediaImageUrl(item, w = 2000) {
  return urlFor(item).width(w).auto('format').url()
}

function coverImageUrl(project, w = 1600) {
  if (!project.coverImage) return ''
  return urlFor(project.coverImage).width(w).auto('format').url()
}

/* ─── Fetch content from Sanity ─────────────────────────────────── */
const content = await fetchContent()
const {sections: sectionsDocs, projects: projectDocs} = content

// Landing SECTIONS (derived from Sanity)
const SECTIONS = sectionsDocs.map((s, i) => ({
  id: s.slug,
  bg: s.landingBg || '#0D0D0D',
  accent: s.landingAccent || '#FF313B',
  headline: s.landingHeadline || (s.title || '').toUpperCase(),
  subtitle: s.landingSubtitle || '',
  counterPrefix: `${String(s.order).padStart(2, '0')} / ${String(sectionsDocs.length).padStart(2, '0')} — `,
  counterSection: s.counterLabel || s.title,
  cNum: `__${String(s.order).padStart(2, '0')}`,
  cTitle: (s.title || '').replace(/\.$/, '').toUpperCase(),
  cSub: s.cardLabel || s.subtitle || '',
}))

// Illustration HTML by slug
const ILLUS = Object.fromEntries(
  sectionsDocs.map((s) => [s.slug, s.illustrationSvg || ''])
)

// Detail PAGES keyed by slug, with works filtered per section
const PAGES = Object.fromEntries(
  sectionsDocs.map((s) => {
    const works = projectDocs
      .filter((p) => p.sectionSlug === s.slug)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        year: p.year || '',
        caption: p.caption || '',
        tags: p.tags || [],
        coverUrl: coverImageUrl(p),
        media: p.media || [],
      }))
    return [
      s.slug,
      {
        kicker: s.kicker || '',
        manifesto: (s.manifesto || '').replace(/\n/g, '<br>'),
        lead: (s.lead || '').replace(/\n/g, '<br>'),
        agencies: s.agencies || [],
        worksLabel: s.worksLabel || 'Selected Works',
        worksTitle: s.worksTitle || '',
        works,
      },
    ]
  })
)

const SITE = content.siteSettings || {}

/* ─── Landing page state & rendering ─────────────────────────────── */
let current = 0

function buildNav() {
  const nav = document.getElementById('nav-cards')
  nav.innerHTML = ''
  SECTIONS.forEach((s, i) => {
    const d = document.createElement('div')
    d.className = 'nav-card' + (i === 0 ? ' active' : '')
    d.dataset.id = s.id
    d.innerHTML = `
      <div class="c-info">
        <span class="c-num">${s.cNum}</span>
        <span class="c-title">${s.cTitle}</span>
        <span class="c-sub">${s.cSub}</span>
      </div>
      <div class="c-icon">${ICONS[s.id] || ''}</div>
    `
    d.addEventListener('click', () => switchTo(i))
    nav.appendChild(d)
  })
}

function renderCounter(s) {
  return `${s.counterPrefix}<span class="counter-section">${s.counterSection}</span>`
}

function applyCardStyles(activeIdx) {
  const s = SECTIONS[activeIdx]
  document.querySelectorAll('.nav-card').forEach((c, j) => {
    const isActive = j === activeIdx
    if (isActive) {
      c.style.background = s.bg
      c.style.color = s.accent
      c.style.borderColor = s.accent
    } else {
      c.style.background = s.accent
      c.style.color = s.bg
      c.style.borderColor = s.accent
    }
    c.classList.toggle('active', isActive)
  })
}

function hackerType(el, text, speed) {
  if (el._twIv) clearInterval(el._twIv)
  const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?/<>'
  const rnd = () => pool[Math.floor(Math.random() * pool.length)]
  let i = 0
  el._twIv = setInterval(() => {
    let out = text.slice(0, i)
    for (let j = i; j < text.length; j++) {
      const c = text[j]
      out += c === ' ' || c === '\n' ? c : rnd()
    }
    el.textContent = out
    i++
    if (i > text.length) {
      clearInterval(el._twIv)
      el._twIv = null
      el.textContent = text
    }
  }, speed)
}

function typeActiveCard(idx) {
  const s = SECTIONS[idx]
  const card = document.querySelectorAll('.nav-card')[idx]
  if (!card) return
  const title = card.querySelector('.c-title')
  const sub = card.querySelector('.c-sub')
  hackerType(title, s.cTitle, 45)
  hackerType(sub, s.cSub, 25)
}

function switchTo(i) {
  if (i === current) return
  current = i
  const s = SECTIONS[i]
  document.documentElement.style.setProperty('--bg', s.bg)
  document.documentElement.style.setProperty('--accent', s.accent)

  const hl = document.getElementById('headline')
  const sub = document.getElementById('subtitle')
  const illus = document.getElementById('illustration')
  const counter = document.getElementById('counter')

  hl.classList.add('fading')
  sub.classList.add('fading')
  illus.classList.add('fading')

  setTimeout(() => {
    hl.textContent = s.headline
    sub.innerHTML = s.subtitle
    illus.innerHTML = ILLUS[s.id]
    illus.dataset.id = s.id
    counter.innerHTML = renderCounter(s)
    hl.classList.remove('fading')
    sub.classList.remove('fading')
    illus.classList.remove('fading')
    document.body.classList.add('switching')
    void document.body.offsetWidth
    document.body.classList.remove('switching')
    requestAnimationFrame(() => document.body.classList.add('switching'))
    setTimeout(() => document.body.classList.remove('switching'), 900)
  }, 180)

  applyCardStyles(i)
  typeActiveCard(i)
}

/* Init landing */
buildNav()
const s0 = SECTIONS[0]
if (s0) {
  document.getElementById('headline').textContent = s0.headline
  document.getElementById('subtitle').innerHTML = s0.subtitle
  document.getElementById('counter').innerHTML = renderCounter(s0)
  document.getElementById('illustration').innerHTML = ILLUS[s0.id] || ''
  document.getElementById('illustration').dataset.id = s0.id
  document.documentElement.style.setProperty('--bg', s0.bg)
  document.documentElement.style.setProperty('--accent', s0.accent)
  applyCardStyles(0)
}

/* ─── DETAIL PAGE ────────────────────────────────── */
const detailPage = document.getElementById('detail-page')
const detailInner = document.getElementById('detail-inner')
const detailBack = document.getElementById('detail-back')

function buildDetail(id) {
  const p = PAGES[id]
  if (!p) return
  const works = p.works.length
    ? p.works
    : [{title: 'Coming Soon', year: '—', caption: 'Project in progress', tags: ['WIP']}]
  const agenciesHTML = p.agencies.length
    ? `
    <div class="detail-section-label">— In Collaboration With</div>
    <div class="agencies">
      <div class="agencies-track">
        ${[...p.agencies, ...p.agencies].map((a) => `<span>${a}</span>`).join('')}
      </div>
    </div>
  `
    : ''
  const contactEmail = SITE.contactEmail || 'madboulyjr.7@gmail.com'
  detailInner.innerHTML = `
    <div class="detail-hero">
      <div class="detail-copy">
        <div class="detail-kicker">${p.kicker}</div>
        <h1 class="manifesto">${p.manifesto}</h1>
        <p class="detail-lead">${p.lead}</p>
      </div>
    </div>
    ${agenciesHTML}
    <div class="detail-section-label">${p.worksLabel} · ${String(works.length).padStart(2, '0')}</div>
    <h2 class="section-title">${p.worksTitle}</h2>
    <div class="works-list">
      ${works
        .map(
          (w, i) => `
        <article class="work-row" data-idx="${i}">
          <div class="work-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="work-mid">
            <div class="work-title">${w.title}${
              w.caption ? `<span class="caption">${w.caption}</span>` : ''
            }</div>
            <div class="work-meta">
              <span class="work-year">${w.year || ''}</span>
              <div class="work-tags">${(w.tags || []).map((t) => `<span>${t}</span>`).join('')}</div>
            </div>
          </div>
          <div class="work-preview">${
            w.coverUrl ? `<img src="${w.coverUrl}" alt="${w.title}" loading="lazy">` : ''
          }</div>
        </article>
      `
        )
        .join('')}
    </div>
    <div class="collab-cta">
      <div class="collab-kicker">Let's Collaborate</div>
      <h2 class="collab-title">Your brand,<br><em>legendary.</em></h2>
      <p class="collab-lead">Ready to elevate your story to legendary status? Let's build something that leaves the competition green with envy.</p>
      <a class="collab-btn" href="mailto:${contactEmail}">Get In Touch → </a>
    </div>
  `
}

function openDetail(id) {
  buildDetail(id)
  detailPage.classList.add('open')
  detailPage.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}
function closeDetail() {
  detailPage.classList.remove('open')
  detailPage.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}
detailBack.addEventListener('click', closeDetail)

/* ─── PROJECT VIEW (inside a work) ───────────────── */
const projectView = document.getElementById('project-view')
const projectViewInner = document.getElementById('project-view-inner')
const projectBack = document.getElementById('project-back')

function renderGalleryItem(item, gi) {
  if (item._type === 'videoItem' && item.playbackId) {
    const autoplay = item.autoplay !== false
    return `<div class="g-item g-video" style="--gi:${gi}">
      <mux-player
        playback-id="${item.playbackId}"
        stream-type="on-demand"
        ${autoplay ? 'autoplay muted loop playsinline' : 'controls'}
        style="width:100%;aspect-ratio:16/9;display:block;--controls:${autoplay ? 'none' : ''}"
      ></mux-player>
    </div>`
  }
  if (item._type === 'image' || item.asset) {
    return `<div class="g-item" style="--gi:${gi}">
      <img src="${mediaImageUrl(item)}" alt="${item.alt || ''}" loading="lazy">
    </div>`
  }
  return ''
}

function buildProject(works, idx) {
  const w = works[idx]
  if (!w) return
  const next = works[(idx + 1) % works.length]
  const media = w.media || []
  projectViewInner.innerHTML = `
    <div class="project-hero">
      <div class="p-top">
        <span class="p-index">— Case ${String(idx + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}</span>
        <span class="p-year-top">${w.year || ''}</span>
      </div>
      <h1 class="p-title">${w.title}</h1>
      <div class="p-meta-row">
        ${w.caption ? `<p class="p-caption">${w.caption}</p>` : '<div></div>'}
        <div class="p-tags">${(w.tags || []).map((t) => `<span>${t}</span>`).join('')}</div>
      </div>
    </div>
    <div class="project-gallery">
      ${
        media.length
          ? media.map((m, gi) => renderGalleryItem(m, gi)).join('')
          : `<div style="padding:6rem;text-align:center;opacity:0.5;font-family:'IBM Plex Mono',monospace;letter-spacing:0.2em;text-transform:uppercase;">No images yet · draft</div>`
      }
    </div>
    <div class="project-nav-next">
      <div class="pn-block">
        <div class="pn-label">Next Project</div>
        <div class="pn-title" id="pn-title">${next.title} →</div>
      </div>
      <div class="pn-arrow" id="pn-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
    </div>
  `
  const goNext = () => openProject(works, (idx + 1) % works.length)
  document.getElementById('pn-title').addEventListener('click', goNext)
  document.getElementById('pn-arrow').addEventListener('click', goNext)
}

function openProject(works, idx) {
  buildProject(works, idx)
  projectView.classList.add('open')
  projectView.setAttribute('aria-hidden', 'false')
  projectView.scrollTo(0, 0)
}
function closeProject() {
  projectView.classList.remove('open')
  projectView.setAttribute('aria-hidden', 'true')
}
projectBack.addEventListener('click', closeProject)

detailInner.addEventListener('click', (e) => {
  const row = e.target.closest('.work-row')
  if (!row) return
  const idx = parseInt(row.dataset.idx, 10)
  const id = document.getElementById('illustration').dataset.id
  const p = PAGES[id]
  if (!p || !p.works.length) return
  openProject(p.works, idx)
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (projectView.classList.contains('open')) closeProject()
    else if (detailPage.classList.contains('open')) closeDetail()
  }
})

/* ─── Illustration click → open detail (bbox-gated) ─────────────── */
document.getElementById('illustration').addEventListener('click', (e) => {
  const bb = bbox || charBBox()
  if (!bb) return
  if (
    e.clientX >= bb.minX &&
    e.clientX <= bb.maxX &&
    e.clientY >= bb.minY &&
    e.clientY <= bb.maxY
  ) {
    const id = document.getElementById('illustration').dataset.id
    openDetail(id)
  }
})

/* ─── Custom cursor ─────────────────────────────── */
const cursor = document.createElement('div')
cursor.className = 'cursor'
cursor.innerHTML = '<div class="cursor-ring"></div><div class="cursor-label">View</div>'
document.body.appendChild(cursor)

let cx = window.innerWidth / 2,
  cy = window.innerHeight / 2
let tx = cx,
  ty = cy
window.addEventListener('mousemove', (e) => {
  tx = e.clientX
  ty = e.clientY
})
function rafCursor() {
  cx += (tx - cx) * 0.22
  cy += (ty - cy) * 0.22
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`
  requestAnimationFrame(rafCursor)
}
rafCursor()

const illusEl = document.querySelector('.illustration')
function charBBox() {
  const svg = illusEl.querySelector('svg')
  if (!svg) return null
  const shapes = svg.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse')
  if (!shapes.length) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  shapes.forEach((s) => {
    const r = s.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return
    if (r.left < minX) minX = r.left
    if (r.top < minY) minY = r.top
    if (r.right > maxX) maxX = r.right
    if (r.bottom > maxY) maxY = r.bottom
  })
  return {minX, minY, maxX, maxY}
}
let bbox = charBBox()
window.addEventListener('resize', () => {
  bbox = charBBox()
})
const mo = new MutationObserver(() => {
  setTimeout(() => {
    bbox = charBBox()
  }, 50)
})
mo.observe(illusEl, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-id']})

window.addEventListener('mousemove', (e) => {
  let hover = false
  const t = e.target
  if (t && t.closest && t.closest('.work-row')) {
    hover = true
  } else if (!detailPage.classList.contains('open') && !projectView.classList.contains('open')) {
    if (!bbox) bbox = charBBox()
    if (
      bbox &&
      e.clientX >= bbox.minX &&
      e.clientX <= bbox.maxX &&
      e.clientY >= bbox.minY &&
      e.clientY <= bbox.maxY
    ) {
      hover = true
    }
  }
  if (hover) cursor.classList.add('hover')
  else cursor.classList.remove('hover')
})

/* ─── Apply site settings to static header ─────────────── */
if (SITE.tagline) {
  const el = document.querySelector('.tagline')
  if (el) el.textContent = SITE.tagline
}
if (SITE.websiteUrl && SITE.websiteUrlLabel) {
  const el = document.querySelector('.website')
  if (el) {
    el.href = SITE.websiteUrl
    el.textContent = SITE.websiteUrlLabel
  }
}

/* hide loading state */
document.body.classList.remove('loading')
