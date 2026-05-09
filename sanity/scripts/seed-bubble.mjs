#!/usr/bin/env node
/**
 * Seed the Bubble section with 4 personal Behance projects.
 * Uploads cover images from /assets-source/bubble/<slug>.png and creates
 * project documents referencing the bubble section.
 *
 * Usage: node sanity/scripts/seed-bubble.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
dotenv.config({path: path.join(PROJECT_ROOT, '.env.local')})

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('Missing SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const ASSET_DIR = path.join(PROJECT_ROOT, 'assets-source/bubble')

const BUBBLE_PROJECTS = [
  {
    slug: 'cairos-streets',
    title: "A Tribute to Cairo's Streets",
    year: '2024',
    caption:
      "A visual exploration celebrating Cairo's microbus street culture through expressive Arabic typography and bold composition. — Captures the movement and rhythm of everyday urban commuting.",
    tags: ['Poster', 'Typography', 'Illustration', 'Personal'],
    img: 'cairos-streets.png',
    behance: 'https://www.behance.net/gallery/241708103/A-Tribute-to-Cairos-Streets',
  },
  {
    slug: 'hype-with-us',
    title: 'Hype With Us',
    year: '2020',
    caption:
      'A collage art series cutting magazine paper, photography and texture into single frames. — Built in Photoshop, Illustrator and After Effects.',
    tags: ['Collage', 'Mixed Media', 'Personal'],
    img: 'hype-with-us.png',
    behance: 'https://www.behance.net/gallery/104685933/Hype-With-us-Collage-Art',
  },
  {
    slug: 'same-companion',
    title: 'Same Companion, Different Feelings',
    year: '2023',
    caption:
      'An automotive concept piece — same Mustang, four different emotional treatments. — Manipulation + visual storytelling exploring how lighting, palette and crop change the car\'s character.',
    tags: ['Automotive', 'Concept', 'Manipulation', 'Personal'],
    img: 'same-companion.png',
    behance: 'https://www.behance.net/gallery/162100823/Same-companion-Different-feelings',
  },
  {
    slug: 'after-perdition',
    title: 'After Perdition · Poster N.05',
    year: '2019',
    caption:
      'Cyberpunk visual art exploring transcendence beyond perdition. — Neon, Japan-inspired neo-futurism, manipulation as language.',
    tags: ['Poster', 'Cyberpunk', 'Manipulation', 'Personal'],
    img: 'after-perdition.png',
    behance: 'https://www.behance.net/gallery/88264481/AFTER-PERDITION-Poster-N05',
  },
]

async function uploadImage(filename) {
  const filePath = path.join(ASSET_DIR, filename)
  const buf = readFileSync(filePath)
  const asset = await client.assets.upload('image', buf, {filename})
  return asset
}

async function seed() {
  // Look up the Bubble section's Sanity _id
  const bubble = await client.fetch(`*[_type == "section" && slug.current == "bubble"][0]{_id}`)
  if (!bubble) {
    throw new Error('Bubble section not found in Sanity. Seed sections first.')
  }
  console.log(`\nSeeding ${BUBBLE_PROJECTS.length} Bubble projects (section ${bubble._id})\n`)

  for (let i = 0; i < BUBBLE_PROJECTS.length; i++) {
    const p = BUBBLE_PROJECTS[i]
    process.stdout.write(`  ${(i + 1).toString().padStart(2, '0')}. ${p.title.padEnd(36)} `)

    // 1) upload cover
    const asset = await uploadImage(p.img)
    process.stdout.write(`✓ uploaded `)

    // 2) create-or-replace project doc
    const projectDoc = {
      _id: `project-${p.slug}`,
      _type: 'project',
      title: p.title,
      slug: {_type: 'slug', current: p.slug},
      section: {_type: 'reference', _ref: bubble._id},
      order: i + 1,
      year: p.year,
      caption: p.caption,
      tags: p.tags,
      coverImage: {
        _type: 'image',
        asset: {_type: 'reference', _ref: asset._id},
      },
      caseStudy: {
        externalUrl: p.behance,
      },
      published: true,
    }
    await client.createOrReplace(projectDoc)
    console.log(`✓ created`)
  }
  console.log('\n✓ Done. Visit /bubble to see them live.\n')
}

seed().catch((err) => {
  console.error('\n✗ Seed failed:', err.message || err)
  process.exit(1)
})
