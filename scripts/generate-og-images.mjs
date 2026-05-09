#!/usr/bin/env node
/**
 * Build-time OG image generator for every project + section.
 *
 * For each section + project, produces a 1200×630 PNG showing:
 *   • Section: section name big + tagline
 *   • Project: title + section + year, with the project cover image
 *     fetched from Sanity CDN as the visual backdrop (auto-darkened
 *     for legibility), MAD logo + "beingmad.co" stamp.
 *
 * Output: /public/og/<section-or-project-slug>.jpg
 * Wired via vite-config sitemapPlugin so it runs before the build closes.
 *
 * Usage: node scripts/generate-og-images.mjs
 */
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdirSync, writeFileSync, statSync} from 'node:fs'
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
dotenv.config({path: path.join(PROJECT_ROOT, '.env.local')})

const OUT_DIR = path.join(PROJECT_ROOT, 'public', 'og')
mkdirSync(OUT_DIR, {recursive: true})

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

const ID_TO_URL = {originals: 'originals', bubble: 'bubble', music: 'madplus', vision: 'vision'}
const SECTION_TAGLINES = {
  originals: 'Brand systems · Art direction · 360 campaigns',
  bubble: 'Personal art · Collage · Concept work',
  music: 'Sound · Beats · Production',
  vision: 'Moving image · AI-augmented · Generative',
}

/* MAD logo SVG path (embedded in every card) */
const MAD_LOGO_SVG = `
  <g transform="translate(60 540) scale(0.18) translate(-30 -320)" fill="#F5F0E1" opacity="0.95">
    <path d="M39.25,329.84h64.47l35.87,41.64l17.07-41.64h80.11v139.39h-65.84l-5.49-72.29l-16.46,72.29h-35.67l-44.17-72.68l22.22,72.68H39.25V329.84z"/>
    <path fill-rule="evenodd" d="M286.44,329.84h86.42l30.18,139.39h-55.29l-10.97-36.64h-26.06l-2.19,36.64h-65.42L286.44,329.84z M330,408.3l-14.54-48.39l-3.02,48.39H330z"/>
    <path fill-rule="evenodd" d="M503.63,329.84h-93.44v139.39h93.44c28.64,0,51.86-23.22,51.86-51.86V381.7C555.49,353.06,532.27,329.84,503.63,329.84z M448.05,389.64v-29.73l76.11,4.75L448.05,389.64z"/>
  </g>
`

function escapeXml(s) {
  return String(s || '').replace(/[<>&"']/g, (c) =>
    ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[c]),
  )
}

function svgWrapper(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${content}
</svg>`
}

/* Section card — large name on dark backdrop, tagline below. */
function sectionCardSvg(section) {
  const name = section.title || section.slug || 'Section'
  const tagline = SECTION_TAGLINES[section.slug] || ''
  return svgWrapper(`
    <rect width="1200" height="630" fill="#0A0A0A"/>
    <!-- subtle grid -->
    <g stroke="#F5F0E1" stroke-width="0.5" opacity="0.05">
      <line x1="60" y1="0" x2="60" y2="630"/>
      <line x1="600" y1="0" x2="600" y2="630"/>
      <line x1="1140" y1="0" x2="1140" y2="630"/>
    </g>
    ${MAD_LOGO_SVG}
    <text x="60" y="590" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="20" letter-spacing="3" fill="#F5F0E1" opacity="0.55">
      BEINGMAD.CO · /${escapeXml(ID_TO_URL[section.slug] || section.slug)}
    </text>
    <text x="60" y="320" font-family="'Hanken Grotesk', sans-serif" font-weight="700"
          font-size="120" letter-spacing="-3" fill="#F5F0E1">
      ${escapeXml(name)}.
    </text>
    <text x="60" y="380" font-family="'Newsreader', Georgia, serif"
          font-style="italic" font-weight="500" font-size="36" fill="#D0FA51">
      ${escapeXml(tagline)}
    </text>
  `)
}

/* Project card — cover image as backdrop with darken overlay,
   project title + meta on top. */
async function projectCardSvg(project, coverBuf) {
  const title = project.title || 'Untitled'
  const year = project.year ? ` · ${project.year}` : ''
  const sectionLabel = project.sectionTitle || ''
  const coverEmbed = coverBuf
    ? `<image x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${coverBuf.toString('base64')}"/>`
    : `<rect width="1200" height="630" fill="#1A1815"/>`
  return svgWrapper(`
    ${coverEmbed}
    <rect width="1200" height="630" fill="url(#darken)"/>
    <defs>
      <linearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(10,10,10,0.55)"/>
        <stop offset="100%" stop-color="rgba(10,10,10,0.92)"/>
      </linearGradient>
    </defs>
    ${MAD_LOGO_SVG}
    <text x="60" y="590" font-family="'IBM Plex Mono', monospace" font-weight="500"
          font-size="20" letter-spacing="3" fill="#F5F0E1" opacity="0.65">
      ${escapeXml(sectionLabel.toUpperCase())} · BEINGMAD.CO
    </text>
    <text x="60" y="380" font-family="'Hanken Grotesk', sans-serif" font-weight="600"
          font-size="84" letter-spacing="-2" fill="#F5F0E1">
      ${escapeXml(title)}.
    </text>
    <text x="60" y="430" font-family="'Newsreader', Georgia, serif"
          font-style="italic" font-weight="500" font-size="32" fill="#D0FA51">
      ${escapeXml(sectionLabel)}${escapeXml(year)}
    </text>
  `)
}

async function fetchCoverBuf(coverUrl) {
  if (!coverUrl) return null
  try {
    // Request a 1200×630 cropped version directly from Sanity CDN
    const url = `${coverUrl}?w=1200&h=630&fit=crop&auto=format&q=80`
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // Re-encode to JPEG to ensure SVG embed works (some Sanity outputs are WebP)
    return await sharp(buf).jpeg({quality: 80}).toBuffer()
  } catch {
    return null
  }
}

async function main() {
  console.log('\n  Fetching sections + projects from Sanity…')
  const data = await client.fetch(`{
    "sections": *[_type == "section"]{
      _id, "slug": slug.current, title, subtitle, description
    },
    "projects": *[_type == "project" && published == true]{
      _id, "slug": slug.current,
      "sectionSlug": section->slug.current,
      "sectionTitle": section->title,
      title, year,
      "coverUrl": coverImage.asset->url
    }
  }`)

  console.log(`  ${data.sections.length} sections + ${data.projects.length} projects`)
  console.log('  Generating OG cards…\n')

  let total = 0
  let totalSize = 0

  // Section cards
  for (const s of data.sections) {
    const svg = sectionCardSvg(s)
    const out = path.join(OUT_DIR, `${ID_TO_URL[s.slug] || s.slug}.jpg`)
    await sharp(Buffer.from(svg)).jpeg({quality: 88, mozjpeg: true}).toFile(out)
    const size = statSync(out).size
    totalSize += size
    total++
    console.log(`    ✓ ${path.basename(out).padEnd(28)}  ${(size / 1024).toFixed(1).padStart(5)} KB`)
  }

  // Project cards
  for (const p of data.projects) {
    const coverBuf = await fetchCoverBuf(p.coverUrl)
    const svg = await projectCardSvg(p, coverBuf)
    const sectionUrl = ID_TO_URL[p.sectionSlug] || p.sectionSlug || 'originals'
    const out = path.join(OUT_DIR, `${sectionUrl}-${p.slug}.jpg`)
    await sharp(Buffer.from(svg)).jpeg({quality: 88, mozjpeg: true}).toFile(out)
    const size = statSync(out).size
    totalSize += size
    total++
    console.log(`    ✓ ${path.basename(out).padEnd(40)}  ${(size / 1024).toFixed(1).padStart(5)} KB`)
  }

  console.log(`\n  Generated ${total} OG cards · ${(totalSize / 1024).toFixed(0)} KB total\n`)
}

main().catch((err) => {
  console.error('\n  ✗ OG generation failed:', err.message || err)
  process.exit(1)
})
