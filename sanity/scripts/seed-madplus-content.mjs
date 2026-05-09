#!/usr/bin/env node
/**
 * Seed the MAD+ section with mock featuredRelease + releases content
 * so the new hero card / branded player / releases wall renders with
 * real-looking data. Generates 6 unique on-brand album-art covers
 * (sharp + inline SVG → JPG, no external assets), uploads them to
 * Sanity, then patches section-music with:
 *
 *   featuredRelease: {kicker, title, subtitle, year, label, cover, platforms}
 *   releases: [...5 entries with cover + listenUrl]
 *
 * Re-running is safe — covers are deterministic by title hash so we
 * upload fresh assets each time but the section fields just get
 * overwritten with the latest references.
 *
 * Usage: node sanity/scripts/seed-madplus-content.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({path: path.resolve(__dirname, '../../.env.local')})

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error('  ✗ Missing SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

/* ─── Album-art generator ──────────────────────────────────────
 * Six on-brand cover variants (1200×1200) — alternating layouts
 * keep the wall visually varied without needing real artwork. */

function escapeXml(s) {
  return String(s || '').replace(/[<>&"']/g, (c) =>
    ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[c]),
  )
}

function svgWrap(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">${content}</svg>`
}

/** Variant A — bold red with cream type stacked left */
function coverA({title, year, kind}) {
  return svgWrap(`
    <rect width="1200" height="1200" fill="#FF313B"/>
    <!-- Subtle grid -->
    <g stroke="#F5F0E1" stroke-width="1" opacity="0.08">
      <line x1="60" y1="0" x2="60" y2="1200"/>
      <line x1="600" y1="0" x2="600" y2="1200"/>
      <line x1="1140" y1="0" x2="1140" y2="1200"/>
    </g>
    <text x="60" y="160" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="32" letter-spacing="6" fill="#F5F0E1" opacity="0.85">
      ${escapeXml((kind || '').toUpperCase())} · ${escapeXml(year)}
    </text>
    <text x="60" y="780" font-family="'Hanken Grotesk', sans-serif" font-weight="700"
          font-size="180" letter-spacing="-6" fill="#F5F0E1">
      ${escapeXml(title.split(' ')[0] || title)}.
    </text>
    ${title.split(' ').length > 1
      ? `<text x="60" y="970" font-family="'Newsreader', Georgia, serif" font-style="italic" font-weight="500"
              font-size="120" letter-spacing="-3" fill="#0A0A0A">
           ${escapeXml(title.split(' ').slice(1).join(' '))}
         </text>`
      : ''}
    <text x="60" y="1140" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#0A0A0A" opacity="0.75">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

/** Variant B — dark with red accent block + huge title */
function coverB({title, year, kind}) {
  return svgWrap(`
    <rect width="1200" height="1200" fill="#0A0A0A"/>
    <!-- Red corner block -->
    <rect x="700" y="0" width="500" height="500" fill="#FF313B"/>
    <text x="60" y="160" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="32" letter-spacing="6" fill="#F5F0E1" opacity="0.55">
      ${escapeXml((kind || '').toUpperCase())} · ${escapeXml(year)}
    </text>
    <text x="60" y="700" font-family="'Hanken Grotesk', sans-serif" font-weight="600"
          font-size="200" letter-spacing="-8" fill="#F5F0E1">
      ${escapeXml(title.split(' ')[0] || title).slice(0, 7)}
    </text>
    <text x="60" y="900" font-family="'Newsreader', Georgia, serif" font-style="italic" font-weight="500"
          font-size="100" letter-spacing="-2" fill="#FF313B">
      ${escapeXml(title.split(' ').slice(1).join(' ') || '/')}
    </text>
    <text x="60" y="1140" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#F5F0E1" opacity="0.55">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

/** Variant C — cream bg with red typography (inverse) */
function coverC({title, year, kind}) {
  const big = title.split(' ')[0] || title
  const sub = title.split(' ').slice(1).join(' ')
  return svgWrap(`
    <rect width="1200" height="1200" fill="#F5F0E1"/>
    <!-- Black border square -->
    <rect x="40" y="40" width="1120" height="1120" fill="none" stroke="#0A0A0A" stroke-width="3"/>
    <text x="80" y="180" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="32" letter-spacing="6" fill="#0A0A0A" opacity="0.65">
      ${escapeXml((kind || '').toUpperCase())} · ${escapeXml(year)}
    </text>
    <text x="80" y="640" font-family="'Hanken Grotesk', sans-serif" font-weight="800"
          font-size="220" letter-spacing="-10" fill="#FF313B">
      ${escapeXml(big.toUpperCase()).slice(0, 7)}
    </text>
    ${sub ? `<text x="80" y="820" font-family="'Newsreader', Georgia, serif" font-style="italic" font-weight="500"
            font-size="110" letter-spacing="-3" fill="#0A0A0A">
       ${escapeXml(sub)}
     </text>` : ''}
    <text x="80" y="1110" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#0A0A0A" opacity="0.65">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

/** Variant D — vertical stripes pattern */
function coverD({title, year, kind}) {
  const big = title.split(' ')[0] || title
  return svgWrap(`
    <rect width="1200" height="1200" fill="#0A0A0A"/>
    <!-- Vertical stripes -->
    <g>
      ${Array.from({length: 12}).map((_, i) =>
        `<rect x="${i * 100}" y="0" width="50" height="1200" fill="${i % 3 === 0 ? '#FF313B' : '#1A1815'}" opacity="${i % 3 === 0 ? '0.85' : '0.6'}"/>`
      ).join('')}
    </g>
    <!-- Cream banner -->
    <rect x="60" y="500" width="1080" height="280" fill="#F5F0E1"/>
    <text x="100" y="640" font-family="'Hanken Grotesk', sans-serif" font-weight="700"
          font-size="160" letter-spacing="-6" fill="#0A0A0A">
      ${escapeXml(big).slice(0, 9)}
    </text>
    <text x="100" y="730" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="36" letter-spacing="6" fill="#FF313B">
      ${escapeXml((kind || '').toUpperCase())} / ${escapeXml(year)}
    </text>
    <text x="60" y="1140" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#F5F0E1" opacity="0.65">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

/** Variant E — circular accent with title in center */
function coverE({title, year, kind}) {
  return svgWrap(`
    <rect width="1200" height="1200" fill="#1A1815"/>
    <!-- Big red circle -->
    <circle cx="600" cy="600" r="450" fill="#FF313B"/>
    <text x="600" y="620" text-anchor="middle"
          font-family="'Hanken Grotesk', sans-serif" font-weight="800"
          font-size="180" letter-spacing="-8" fill="#0A0A0A">
      ${escapeXml(title.split(' ')[0] || title).slice(0, 6).toUpperCase()}
    </text>
    <text x="600" y="720" text-anchor="middle"
          font-family="'Newsreader', Georgia, serif" font-style="italic" font-weight="500"
          font-size="68" fill="#0A0A0A">
      ${escapeXml(title.split(' ').slice(1).join(' ') || '·')}
    </text>
    <text x="60" y="160" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="32" letter-spacing="6" fill="#F5F0E1" opacity="0.55">
      ${escapeXml((kind || '').toUpperCase())} · ${escapeXml(year)}
    </text>
    <text x="60" y="1140" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#F5F0E1" opacity="0.55">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

/** Variant F — split halves */
function coverF({title, year, kind}) {
  const big = title.split(' ')[0] || title
  const sub = title.split(' ').slice(1).join(' ')
  return svgWrap(`
    <rect x="0" y="0" width="600" height="1200" fill="#0A0A0A"/>
    <rect x="600" y="0" width="600" height="1200" fill="#FF313B"/>
    <text x="100" y="600" font-family="'Hanken Grotesk', sans-serif" font-weight="700"
          font-size="140" letter-spacing="-6" fill="#F5F0E1">
      ${escapeXml(big).slice(0, 6)}
    </text>
    <text x="700" y="600" font-family="'Newsreader', Georgia, serif" font-style="italic" font-weight="500"
          font-size="100" letter-spacing="-3" fill="#0A0A0A">
      ${escapeXml(sub || '/')}
    </text>
    <text x="100" y="160" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="32" letter-spacing="6" fill="#F5F0E1" opacity="0.6">
      ${escapeXml((kind || '').toUpperCase())} · ${escapeXml(year)}
    </text>
    <text x="100" y="1140" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="22" letter-spacing="4" fill="#F5F0E1" opacity="0.55">
      MAD · BEINGMAD.CO/MADPLUS
    </text>
  `)
}

const VARIANTS = [coverA, coverB, coverC, coverD, coverE, coverF]

async function generateCoverBuffer(release, idx) {
  const fn = VARIANTS[idx % VARIANTS.length]
  const svg = fn(release)
  return await sharp(Buffer.from(svg)).jpeg({quality: 88, mozjpeg: true}).toBuffer()
}

async function uploadCover(buf, filename) {
  const asset = await client.assets.upload('image', buf, {filename, contentType: 'image/jpeg'})
  return asset
}

/* ─── Mock content ────────────────────────────────────────────
 * Featured release + 5 past releases. Listen URLs all point to
 * Madbouly's existing Spotify artist page as fallback — Ali can
 * swap them for individual track URLs via /admin once he ships
 * the actual tracks. */

const SPOTIFY_FALLBACK = 'https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy?si=WI8kEHFSTzq07Mh9orPeiA'
const APPLE_FALLBACK = 'https://music.apple.com/us/artist/madbouly/1763009729'
const ANGHAMI_FALLBACK = 'https://play.anghami.com/artist/25197772'
const YOUTUBE_FALLBACK = 'https://www.youtube.com/channel/UCJCnMKiBxw5eTq489WUNYzg'

const FEATURED = {
  kicker: 'LATEST DROP',
  title: 'Late Night',
  subtitle: 'Loops · Vol. 02',
  year: '2025',
  label: 'Beat-tape · Self-released',
  kind: 'Beat-tape',
}

const RELEASES = [
  {title: 'First Light', subtitle: '', year: '2024', kind: 'Single', listenUrl: SPOTIFY_FALLBACK},
  {title: 'Madness', subtitle: 'Sessions', year: '2024', kind: 'EP', listenUrl: SPOTIFY_FALLBACK},
  {title: 'Cairo Tape', subtitle: '', year: '2023', kind: 'Beat-tape', listenUrl: ANGHAMI_FALLBACK},
  {title: 'Static', subtitle: '', year: '2023', kind: 'Single', listenUrl: APPLE_FALLBACK},
  {title: 'Dawn Loops', subtitle: 'Vol. 01', year: '2022', kind: 'Beat-tape', listenUrl: SPOTIFY_FALLBACK},
]

/* ─── Run ────────────────────────────────────────────────────── */

async function main() {
  console.log('\n  Generating + uploading 6 album covers (1200×1200)…\n')

  // 1. Featured
  const featuredBuf = await generateCoverBuffer({title: 'Late Night Loops', year: FEATURED.year, kind: FEATURED.kind}, 0)
  const featuredAsset = await uploadCover(featuredBuf, 'madplus-late-night-loops-vol-2.jpg')
  console.log(`    ✓ Featured "Late Night · Loops Vol. 02"  →  ${featuredAsset._id}`)

  // 2. Releases
  const releaseAssets = []
  for (let i = 0; i < RELEASES.length; i++) {
    const r = RELEASES[i]
    const buf = await generateCoverBuffer({title: `${r.title} ${r.subtitle}`.trim(), year: r.year, kind: r.kind}, i + 1)
    const asset = await uploadCover(buf, `madplus-${r.title.toLowerCase().replace(/\s+/g, '-')}-${r.year}.jpg`)
    releaseAssets.push(asset)
    console.log(`    ✓ ${r.title.padEnd(20)}  →  ${asset._id}`)
  }

  // 3. Build the patch
  const patch = {
    featuredRelease: {
      kicker: FEATURED.kicker,
      title: `${FEATURED.title} ${FEATURED.subtitle}`.trim(),
      subtitle: 'by MAD',
      year: FEATURED.year,
      label: FEATURED.label,
      cover: {
        _type: 'image',
        asset: {_type: 'reference', _ref: featuredAsset._id},
      },
      platforms: [
        {_key: 'fr-spotify', platform: 'spotify', url: SPOTIFY_FALLBACK},
        {_key: 'fr-apple', platform: 'apple-music', url: APPLE_FALLBACK},
        {_key: 'fr-anghami', platform: 'anghami', url: ANGHAMI_FALLBACK},
        {_key: 'fr-youtube', platform: 'youtube', url: YOUTUBE_FALLBACK},
      ],
    },
    releases: RELEASES.map((r, i) => ({
      _key: `rl-${r.title.toLowerCase().replace(/\s+/g, '-')}-${r.year}`,
      title: `${r.title}${r.subtitle ? ` · ${r.subtitle}` : ''}`,
      year: r.year,
      kind: r.kind,
      listenUrl: r.listenUrl,
      cover: {
        _type: 'image',
        asset: {_type: 'reference', _ref: releaseAssets[i]._id},
      },
    })),
  }

  console.log('\n  Patching section-music…\n')
  await client.patch('section-music').set(patch).commit()

  console.log(`  ✓ Done. Featured release: "${patch.featuredRelease.title}"`)
  console.log(`  ✓ ${patch.releases.length} past releases on the wall`)
  console.log('\n  Refresh https://beingmad.co/madplus to see it live.\n')
}

main().catch((err) => {
  console.error('\n  ✗ Seed failed:', err.message || err)
  process.exit(1)
})
