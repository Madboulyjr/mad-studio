# beingmad.co — Site Improvements & Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Fix two interaction bugs (project cards can't open in a new tab; avatar sometimes needs multiple clicks to enter a section) and add the genuinely-missing web improvements (JSON-LD structured data + hover prefetch), without rebuilding what already exists.

**Architecture:** Vanilla-JS SPA (no framework) built with Vite, content from Sanity, deployed on Vercel. Client routing lives in `src/main.js` (`parseRoute` / `urlForRoute` / `navigate`). A Vite `closeBundle` plugin in `vite.config.js` pre-renders one static HTML file per route with correct `<title>` + Open Graph meta. Section/project OG images and `sitemap.xml` are already generated at build time; Vercel Analytics is already wired in `src/main.js`. This plan changes rendering of the work cards to real anchors, measures the avatar hit-box live, and extends the pre-render plugin with JSON-LD.

**Tech Stack:** JavaScript (ES modules), Vite 5, `@sanity/client`, `@vercel/analytics`, Vercel hosting, `sharp` (OG image gen).

**Already implemented — explicitly OUT OF SCOPE (do NOT rebuild — YAGNI):**
- Vercel **Analytics** — `injectAnalytics()` already fires on the `beingmad.co` host (`src/main.js:2-7`).
- **Per-route OG meta + canonical** — `perUrlHtmlPlugin` in `vite.config.js` already patches `og:title/description/url/image` and canonical per section and per project.
- **Per-project OG images** — `scripts/generate-og-images.mjs` already renders `/og/<section>-<slug>.jpg` for every project (present in `dist/og/`).
- **sitemap.xml** — `sitemapPlugin()` already emits it.

**Test strategy (adaptation):** The project has **no unit-test harness** (`devDependencies`: dotenv, sharp, vite only). Adding Vitest solely for these changes is scope creep (YAGNI). Verification is therefore done via: (a) `npx vite build` succeeding, (b) `grep`/`curl` assertions against built output in `dist/` and the live deploy, and (c) manual browser/preview checks for interaction. Every task below states its exact verification command and expected output.

**Workflow note:** Prior work on this repo has been committed directly to `main` and deployed with `vercel --prod --yes`. Either continue on `main` or create a branch `git checkout -b fix/nav-and-web-polish` first. Deploy is a separate manual step after the plan lands (not part of any task's commit).

---

## Task 1: Project cards open in a new tab (real anchors)

**Problem:** Work cards render as `<article class="work-row" data-idx>` (`src/main.js:1713`) and navigation happens only through a delegated JS `click` handler (`src/main.js:2164`). With no `href`, middle-click / ⌘-click / right-click→"Open in new tab" do nothing. Fix: render each card as a real `<a href="/<section>/<slug>">` and keep the smooth SPA transition for plain left-clicks only.

**Files:**
- Modify: `src/main.js:1712-1736` (work-row markup)
- Modify: `src/main.js:2164-2191` (delegated click handler)
- Modify: `src/index.html` (CSS — add `a.work-row` reset near the existing `.work-row` rules)

**Step 1: Change the work-row markup to an anchor**

In `src/main.js`, inside `buildDetail(id)` the works `.map((w, i) => …)` returns the card. `id` is in scope (the section id). Replace the opening/closing tags of the card.

Find (`src/main.js:1713`):
```js
        <article class="work-row" data-idx="${i}">
```
Replace with:
```js
        <a class="work-row" data-idx="${i}" href="/${ID_TO_URL[id] || id}/${encodeURIComponent(w.slug)}">
```

Find the matching close (`src/main.js:1735`):
```js
        </article>
```
Replace with:
```js
        </a>
```

> `ID_TO_URL` is a module-level const (`src/main.js:2668`); `buildDetail` runs at click-time so it is defined. This produces hrefs like `/originals/bank-aljazira` — exactly what `parseRoute` expects.

**Step 2: Make the click handler pass modified clicks through to the browser**

The delegated handler must (a) ignore clicks that the browser should handle natively (new tab / new window), and (b) `preventDefault()` for the plain-left-click SPA path so the anchor doesn't ALSO do a full navigation.

Find (`src/main.js:2164-2172`):
```js
detailInner.addEventListener('click', (e) => {
  const row = e.target.closest('.work-row')
  if (!row) return
  const idx = parseInt(row.dataset.idx, 10)
  const id = detailPage.dataset.sectionId || document.getElementById('illustration').dataset.id
  const p = PAGES[id]
  if (!p || !p.works.length) return
  const slug = p.works[idx] && p.works[idx].slug
  if (!slug) return
```
Replace with:
```js
detailInner.addEventListener('click', (e) => {
  const row = e.target.closest('.work-row')
  if (!row) return
  // Let the browser handle new-tab / new-window / download intents natively
  // (⌘/Ctrl-click, middle-click, Shift/Alt-click). Only intercept a plain
  // left-click for the smooth in-app transition.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  const idx = parseInt(row.dataset.idx, 10)
  const id = detailPage.dataset.sectionId || document.getElementById('illustration').dataset.id
  const p = PAGES[id]
  if (!p || !p.works.length) return
  const slug = p.works[idx] && p.works[idx].slug
  if (!slug) return
```

> The rest of the handler (transition + `navigate({view:'project', id, projectSlug: slug})`) is unchanged.

**Step 3: Add the anchor CSS reset**

The card was an `<article>`; as an `<a>` it needs the underline/colour reset so it looks identical. In `src/index.html`, find the block of `.work-row` rules and add immediately after the main `.work-row { … }` rule:
```css
    a.work-row { text-decoration: none; color: inherit; }
    a.work-row:focus-visible { outline: 2px solid var(--accent, #fff); outline-offset: 4px; }
```
> Search `src/index.html` for `.work-row` to locate the rules. If `--accent` is not a defined CSS var in that file, use `#ffffff` instead.

**Step 4: Build and verify the anchors render with hrefs**

Run: `npx vite build`
Expected: `✓ built` and `✓ Generated per-URL HTML files (N routes)` with no errors.

Run: `grep -c 'a class="work-row"' dist/assets/*.js 2>/dev/null; grep -o 'href="/originals/[^"]*"' dist/*.html dist/**/*.html 2>/dev/null | head`
Expected: the string `a class="work-row"` appears in the bundled JS (count ≥ 1). (The hrefs are built client-side, so they appear in JS, not the static HTML — the grep on JS is the authoritative check.)

**Step 5: Manual interaction check (preview)**

Start preview (`preview_start`), open a section (`/originals`), then:
- ⌘-click (mac) / middle-click a project card → opens the project in a **new tab** at `/originals/<slug>`.
- Plain left-click → smooth in-app transition to the project (no full reload).
- Right-click → "Open link in new tab" is present and works.
Expected: all three behave as described.

**Step 6: Commit**

```bash
git add src/main.js src/index.html
git commit -m "fix(nav): render project cards as real anchors so they open in new tabs"
```

---

## Task 2: Avatar needs only one click to enter a section

**Problem:** The section avatar's click target is gated by a **cached** bounding box: `let bbox = charBBox()` (`src/main.js:2969`), refreshed only on `resize` and a `MutationObserver`. But the avatar has a CSS float animation + mouse parallax, so its on-screen position drifts away from the cached box. Clicks on the visually-current avatar fall outside the stale box and do nothing — the user clicks repeatedly until the float cycle lines back up. Fix: measure the box **live at click time** (`getBoundingClientRect` returns the post-transform rect, so it tracks the animation/parallax exactly).

**Files:**
- Modify: `src/main.js:2331-2333` (illustration click handler)

**Step 1: Measure the hit-box live on each click**

Find (`src/main.js:2331-2333`):
```js
document.getElementById('illustration').addEventListener('click', (e) => {
  const bb = bbox || charBBox()
  if (!bb) return
```
Replace with:
```js
document.getElementById('illustration').addEventListener('click', (e) => {
  // Measure live: the avatar floats + parallaxes, so a cached bbox goes
  // stale and swallows clicks. getBoundingClientRect reflects the current
  // transformed position, so one click on the avatar always registers.
  const bb = charBBox()
  if (!bb) return
```

> Leave the cached `bbox`, the `resize` listener, and the `MutationObserver` (`src/main.js:2969-2978`) in place — other code may read `bbox`; this change only stops the click handler from trusting a stale value.

**Step 2: Build**

Run: `npx vite build`
Expected: `✓ built` with no errors.

**Step 3: Manual interaction check (preview)**

In preview, on the landing page click each section avatar once (move the mouse slightly first so parallax offsets it).
Expected: a single click enters the section every time (no need to click 3+ times). The synth pluck plays once per click.

**Step 4: Commit**

```bash
git add src/main.js
git commit -m "fix(nav): measure avatar hit-box live so a single click always enters"
```

---

## Task 3: SEO polish — JSON-LD structured data

**Problem:** Per-route OG meta, canonical, per-project OG images, and sitemap already exist, but there is **no JSON-LD structured data** (`grep 'application/ld+json'` returns nothing). Adding it lets Google/social show richer results (Person/Organization for the brand, `CreativeWork` + breadcrumbs per project). Inject it in the existing `perUrlHtmlPlugin` so it ships in the pre-rendered HTML crawlers read.

**Files:**
- Modify: `vite.config.js` (inside `perUrlHtmlPlugin`'s `writeRoute` / route loops)

**Step 1: Add a JSON-LD injector helper inside `writeRoute`**

In `vite.config.js`, inside the `writeRoute = (urlPath, {…}) => { … }` function, after the existing `setNameMeta('twitter:image', …)` line and before the `filePath` computation, add:
```js
        // JSON-LD structured data — injected as a <script> before </head>.
        if (jsonLd) {
          const block = `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`
          html = html.replace('</head>', block + '</head>')
        }
```
Then change the `writeRoute` signature to accept `jsonLd`:
Find:
```js
      const writeRoute = (urlPath, {title, description, ogImage}) => {
```
Replace with:
```js
      const writeRoute = (urlPath, {title, description, ogImage, jsonLd}) => {
```

**Step 2: Add Organization JSON-LD to the landing route**

The plugin currently loops sections and projects. Add a landing-route write at the top of the write phase (just before `// Sections`). Find:
```js
      let count = 0
      // Sections
      for (const s of data.sections) {
```
Replace with:
```js
      let count = 0
      // Landing — brand Organization + WebSite
      writeRoute('/', {
        title: `MAD Studio — ${tagline}`,
        description: tagline,
        ogImage: '/og-cover.jpg',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'MAD Studio',
          url: SITE,
          slogan: tagline,
          sameAs: [
            'https://www.instagram.com/madbovlly',
            'https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy',
          ],
        },
      })
      // Sections
      for (const s of data.sections) {
```

> `/og-cover.jpg` is the existing landing OG image referenced in `src/index.html`. Confirm it exists in `public/` with `ls public/og-cover.jpg`; if the filename differs, use the real one.

**Step 3: Add CreativeWork + BreadcrumbList JSON-LD to each project route**

Find the project loop's `writeRoute(`/${sectionUrl}/${p.slug}`, { … })` call. Add a `jsonLd` field to its object:
```js
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: p.title,
            ...(p.year ? {dateCreated: String(p.year)} : {}),
            ...(p.caption ? {description: (p.caption || '').replace(/\s+—\s+/g, ' ').slice(0, 300)} : {}),
            creator: {'@type': 'Organization', name: 'MAD Studio', url: SITE},
            url: `${SITE}/${sectionUrl}/${p.slug}`,
            image: `${SITE}/og/${sectionUrl}-${p.slug}.jpg`,
            isPartOf: {'@type': 'CollectionPage', name: p.sectionTitle, url: `${SITE}/${sectionUrl}`},
          },
```

**Step 4: Build and verify JSON-LD is present**

Run: `npx vite build`
Expected: `✓ Generated per-URL HTML files (N routes)`.

Run: `grep -l 'application/ld+json' dist/index.html dist/originals/*/index.html 2>/dev/null; grep -o '"@type":"CreativeWork"' dist/originals/*/index.html | head -1`
Expected: `dist/index.html` is listed, and `"@type":"CreativeWork"` prints for at least one project.

**Step 5: Validate the JSON is well-formed**

Run: `node -e "const fs=require('fs');const m=fs.readFileSync('dist/index.html','utf8').match(/<script type=\"application\/ld\+json\">(.*?)<\/script>/s);JSON.parse(m[1]);console.log('valid JSON-LD')"`
Expected: `valid JSON-LD` (throws if malformed).

**Step 6: Commit**

```bash
git add vite.config.js
git commit -m "feat(seo): inject JSON-LD structured data per route in the pre-render plugin"
```

---

## Task 4: Perf — prefetch project HTML on hover

**Problem:** Now that project cards are real anchors (Task 1), we can warm the network before the click. On pointer-enter of a work card, inject a `<link rel="prefetch">` for that project's pre-rendered HTML so the in-app (and new-tab) navigation feels instant. Cheap, progressive, no dependency.

**Files:**
- Modify: `src/main.js` (near the `detailInner` click handler, `src/main.js:~2163`)

**Step 1: Add a one-time prefetch-on-hover listener**

In `src/main.js`, immediately BEFORE the `detailInner.addEventListener('click', …)` handler, add:
```js
/* Warm the network for a project route the moment the user hovers its card —
   makes both the SPA transition and any new-tab open feel instant. Each URL
   is prefetched at most once. */
const _prefetched = new Set()
detailInner.addEventListener('pointerenter', (e) => {
  const row = e.target && e.target.closest && e.target.closest('.work-row')
  if (!row || !row.href) return
  const href = row.getAttribute('href')
  if (!href || _prefetched.has(href)) return
  _prefetched.add(href)
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'document'
  link.href = href
  document.head.appendChild(link)
}, true)
```
> The `true` (capture) is required because `pointerenter` does not bubble; capture lets the single delegated listener catch it for every card.

**Step 2: Build**

Run: `npx vite build`
Expected: `✓ built` with no errors.

**Step 3: Verify prefetch fires (preview)**

Start preview, open `/originals`, hover a project card, then check the network panel via the preview tooling:
Run (preview): inspect network for a request to `/originals/<slug>` of type `prefetch`/document after hover.
Expected: exactly one prefetch request per card, not repeated on re-hover.

**Step 4: Commit**

```bash
git add src/main.js
git commit -m "perf(nav): prefetch project HTML on card hover"
```

---

## Post-plan: deploy & sanity-check

After all tasks land (not part of any task commit):

Run: `vercel --prod --yes`
Then verify live:
- Run: `curl -s -o /dev/null -w "%{http_code}\n" https://www.beingmad.co/originals/<a-real-slug>` → `200`.
- Run: `curl -s https://www.beingmad.co/originals/<a-real-slug>/ | grep -c 'application/ld+json'` → `≥1`.
- Browser: ⌘/middle-click a project card opens a new tab; single avatar click enters a section.

---

## Task summary

| # | Change | Files | Risk |
|---|--------|-------|------|
| 1 | Project cards → real anchors (new-tab support) | `src/main.js`, `src/index.html` | Low |
| 2 | Avatar hit-box measured live (one-click entry) | `src/main.js` | Low |
| 3 | JSON-LD structured data per route | `vite.config.js` | Low |
| 4 | Prefetch project HTML on hover | `src/main.js` | Low |

Analytics, per-route OG meta, per-project OG images, and sitemap are already implemented and intentionally excluded.
