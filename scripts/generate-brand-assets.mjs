#!/usr/bin/env node
/**
 * Generate brand-asset images that the codebase references but can't ship by hand:
 *   public/og-cover.jpg            (1200×630) — Open Graph + Twitter share card
 *   public/apple-touch-icon.png    (180×180)  — iOS home-screen pinning
 *   public/og-cover.png            (1200×630) — same content, lossless backup
 *
 * All three are generated from the SAME brand vocabulary used everywhere on
 * the site (MAD logo SVG + cream/black palette + Hanken/Newsreader fonts) so
 * the favicons, splash, social preview, and home-screen icon look like one
 * coherent system.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../public')

// ─── Open Graph cover (1200×630) ─────────────────────────────────────────────
// Black background, giant cream MAD logo on the left, italic Newsreader tagline
// stacked underneath, four section markers in mono across the bottom.
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0A0A"/>

  <!-- subtle grid background -->
  <g stroke="#F5F0E1" stroke-width="0.5" opacity="0.04">
    <line x1="80" y1="0" x2="80" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="1120" y1="0" x2="1120" y2="630"/>
    <line x1="0" y1="80" x2="1200" y2="80"/>
    <line x1="0" y1="540" x2="1200" y2="540"/>
  </g>

  <!-- top-left status stamp -->
  <text x="80" y="105"
    font-family="'IBM Plex Mono', monospace"
    font-weight="500" font-size="20" letter-spacing="3"
    fill="#F5F0E1" opacity="0.55"
    text-transform="uppercase">
    BEINGMAD.CO
  </text>

  <!-- giant MAD logo (~60% width) -->
  <g transform="translate(80 180) scale(1.95) translate(-30 -320)" fill="#F5F0E1">
    <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
    <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
    <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
  </g>

  <!-- Newsreader italic tagline, right-aligned to balance the logo -->
  <text x="1120" y="495"
    font-family="'Newsreader', Georgia, serif"
    font-style="italic" font-weight="500"
    font-size="44" letter-spacing="-0.5"
    fill="#D0FA51" text-anchor="end">
    Creativity is madness
  </text>
  <text x="1120" y="545"
    font-family="'Newsreader', Georgia, serif"
    font-style="italic" font-weight="500"
    font-size="44" letter-spacing="-0.5"
    fill="#D0FA51" text-anchor="end">
    with a deadline.
  </text>

  <!-- bottom section markers in mono -->
  <text x="80" y="585"
    font-family="'IBM Plex Mono', monospace"
    font-weight="500" font-size="18" letter-spacing="4"
    fill="#F5F0E1" opacity="0.65">
    ORIGINALS · BUBBLE · MAD+ · VISION
  </text>
</svg>
`

await sharp(Buffer.from(ogSvg))
  .jpeg({quality: 90, mozjpeg: true})
  .toFile(path.join(OUT, 'og-cover.jpg'))

await sharp(Buffer.from(ogSvg))
  .png({compressionLevel: 9})
  .toFile(path.join(OUT, 'og-cover.png'))

// ─── Apple Touch Icon (180×180) ──────────────────────────────────────────────
// iOS home-screen pinning. Black background + cream M, no text.
// iOS auto-rounds corners; we ship square + iOS rounds it.
const touchIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#0A0A0A"/>
  <g transform="translate(24 70) scale(0.25) translate(-30 -320)" fill="#F5F0E1">
    <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
    <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
    <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
  </g>
</svg>
`

await sharp(Buffer.from(touchIconSvg))
  .png({compressionLevel: 9})
  .toFile(path.join(OUT, 'apple-touch-icon.png'))

// ─── Report ──────────────────────────────────────────────────────────────────
const {statSync} = await import('node:fs')
const sizes = [
  ['og-cover.jpg', statSync(path.join(OUT, 'og-cover.jpg')).size],
  ['og-cover.png', statSync(path.join(OUT, 'og-cover.png')).size],
  ['apple-touch-icon.png', statSync(path.join(OUT, 'apple-touch-icon.png')).size],
]
console.log('\n  Generated brand assets:\n')
for (const [name, size] of sizes) {
  console.log(`    ${name.padEnd(24)} ${(size / 1024).toFixed(1).padStart(7)} KB`)
}
console.log()
