# beingmad.co — Motion & Case-Study Polish (Design)

**Date:** 2026-07-01
**Goal:** Enhance the existing project/case-study view and add tasteful, editorial motion. Presentational only — same Sanity data, same structure, no new sections/features/deps. Serves the goal of landing freelance + Senior Art Director roles by making the work feel premium.

**Approach chosen:** A — Tasteful/editorial polish (subtle, premium, not gimmicky). All effects gated by `prefers-reduced-motion`.

**Safety:** Restore point tag `pre-polish-2026-07-01` (commit `67c6c8f`). Work happens on branch `polish/motion` and is reviewed on a Vercel **preview** URL before any production deploy. Undo = discard the branch / reset to the tag; production stays untouched until explicitly approved.

## Enhancements

### Project / case-study view
1. **Gallery scroll-reveal** — each `.project-gallery` media item fades + rises (`opacity` + `translateY`, subtle `scale`) as it enters the viewport, with a small per-item stagger. Reuses the existing `is-in-view` IntersectionObserver pattern already used for `.work-row`.
2. **Hero staggered entrance** — on project open, `.project-hero` children (index, title, credits, caption, tags) animate in sequentially (~60ms stagger) via pure CSS on the project-view open state.
3. **Outcome-stats count-up** — `.p-stat-num` values tick from 0 → target when the `.p-outcome` block scrolls into view, preserving non-numeric prefix/suffix (`+240%`, `3.2M`, `12×`). Runs once per view.

### Motion & micro-interactions (global)
4. **Refined hovers** — polish the existing `.work-row` cover zoom + CTA reveal; subtle lift on pills/buttons; **magnetic next-project arrow** (`#pn-arrow` nudges toward the cursor on `pointermove`, springs back on leave).
5. **Reduced-motion** — every effect is disabled under `prefers-reduced-motion: reduce` (instant, no transform/animation).

## Architecture
- **CSS** (entrance + hover) lives in the `<style>` block in `src/index.html`.
- **JS** (3 small helpers) in `src/main.js`, all feature-detected + reduced-motion guarded:
  - gallery reveal IntersectionObserver (extends the existing observer approach),
  - `countUp(el)` for outcome stats,
  - magnetic-arrow `pointermove`/`pointerleave` handlers, wired when the project view renders.
- No dependencies, no Sanity schema changes, no routing changes.

## Data flow
Unchanged. Same GROQ, same `buildDetail` / project-view render. Enhancements are purely presentational layers on the existing DOM.

## Testing
No unit-test harness in the project (YAGNI to add one). Verify via: `npx vite build` success, Vercel **preview** deploy, manual visual check on the preview URL (desktop + mobile), and a `prefers-reduced-motion` toggle check.

## Rollout
1. Implement on `polish/motion`, `vite build`, commit.
2. `vercel` (preview, NOT `--prod`) → share preview URL with Ali.
3. Approved → merge to `main` + `vercel --prod`. Rejected → delete branch; production and the `pre-polish-2026-07-01` tag remain the source of truth.
