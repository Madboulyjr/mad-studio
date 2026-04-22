#!/usr/bin/env node
/**
 * Seeds the Sanity dataset with the initial MAD Studio content.
 * Idempotent: running twice just updates existing docs by slug.
 *
 * Usage:
 *   1. Create a write token at https://www.sanity.io/manage/personal/project/f4pxr4lu/api#tokens
 *   2. Put it in /Users/mad/Desktop/mad-studio-project/.env.local as SANITY_WRITE_TOKEN=...
 *   3. From /Users/mad/Desktop/mad-studio-project run: npm run seed
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {SITE_SETTINGS, SECTIONS, ORIGINALS_PROJECTS} from './seed-data.mjs'

// load illustration SVGs extracted from the HTML
const ILLUS_SVGS = JSON.parse(
  fs.readFileSync(new URL('./illus.json', import.meta.url), 'utf8')
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const ASSET_DIR = '/Users/mad/Desktop/mad-studio-assets/originals'

dotenv.config({path: path.join(PROJECT_ROOT, '.env.local')})

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('\nMissing SANITY_WRITE_TOKEN in .env.local')
  console.error('Create one here: https://www.sanity.io/manage/personal/project/f4pxr4lu/api#tokens')
  console.error('(Token needs "Editor" or "Deploy Studio" role)\n')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})

/** Upload a local file as a Sanity image asset, returning its _id. */
async function uploadImage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`   · skipping (not found): ${path.basename(filePath)}`)
    return null
  }
  const buffer = fs.readFileSync(filePath)
  const asset = await client.assets.upload('image', buffer, {
    filename: path.basename(filePath),
  })
  return asset._id
}

async function seedSiteSettings() {
  console.log('\n1. Seeding site settings…')
  const doc = {_id: 'siteSettings', _type: 'siteSettings', ...SITE_SETTINGS}
  await client.createOrReplace(doc)
  console.log('   ✓ site settings saved')
}

async function seedSections() {
  console.log('\n2. Seeding sections…')
  const sectionIds = {}
  for (const s of SECTIONS) {
    const _id = `section-${s.slug}`
    const doc = {
      _id,
      _type: 'section',
      slug: {_type: 'slug', current: s.slug},
      order: s.order,
      title: s.title,
      subtitle: s.subtitle,
      description: s.description,
      cardLabel: s.cardLabel,
      landingBg: s.landingBg,
      landingAccent: s.landingAccent,
      landingHeadline: s.landingHeadline,
      landingSubtitle: s.landingSubtitle,
      counterLabel: s.counterLabel,
      kicker: s.kicker,
      manifesto: s.manifesto,
      lead: s.lead,
      agencies: s.agencies,
      worksLabel: s.worksLabel,
      worksTitle: s.worksTitle,
      illustrationSvg: ILLUS_SVGS[s.slug] || undefined,
    }
    await client.createOrReplace(doc)
    sectionIds[s.slug] = _id
    console.log(`   ✓ ${s.title}  (/${s.slug})`)
  }
  return sectionIds
}

async function seedProjects(sectionIds) {
  console.log('\n3. Seeding Originals projects + uploading images…')
  const originalsId = sectionIds.originals
  let i = 0
  for (const p of ORIGINALS_PROJECTS) {
    i++
    console.log(`\n   [${i}/${ORIGINALS_PROJECTS.length}] ${p.title}`)
    const _id = `project-${p.slug}`

    // upload cover (first image) + gallery media
    const [coverFile, ...galleryFiles] = p.imgs
    const coverAssetId = coverFile ? await uploadImage(path.join(ASSET_DIR, coverFile)) : null
    const mediaRefs = []
    for (const img of galleryFiles) {
      const assetId = await uploadImage(path.join(ASSET_DIR, img))
      if (assetId) {
        mediaRefs.push({
          _type: 'image',
          _key: `media-${img.replace(/[^a-z0-9]/gi, '')}`,
          asset: {_type: 'reference', _ref: assetId},
          alt: p.title,
        })
      }
    }

    const doc = {
      _id,
      _type: 'project',
      title: p.title,
      slug: {_type: 'slug', current: p.slug},
      section: {_type: 'reference', _ref: originalsId},
      order: i,
      year: p.year,
      caption: p.caption,
      tags: p.tags,
      coverImage: coverAssetId
        ? {_type: 'image', asset: {_type: 'reference', _ref: coverAssetId}, alt: p.title}
        : undefined,
      media: mediaRefs,
      published: true,
    }
    await client.createOrReplace(doc)
    console.log(`   ✓ saved with ${mediaRefs.length} gallery items`)
  }
}

async function main() {
  const sectionsOnly = process.argv.includes('--sections-only')
  console.log('┌─────────────────────────────────────┐')
  console.log('│  MAD Studio · Sanity seed           │')
  console.log(`│  Project: ${client.config().projectId.padEnd(25)} │`)
  console.log(`│  Dataset: ${client.config().dataset.padEnd(25)} │`)
  if (sectionsOnly) console.log('│  Mode:    sections + settings only  │')
  console.log('└─────────────────────────────────────┘')

  await seedSiteSettings()
  const sectionIds = await seedSections()
  if (!sectionsOnly) await seedProjects(sectionIds)

  console.log('\n✓ Done. Open http://localhost:3333 to review.\n')
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message || err)
  if (err.response?.body) console.error(err.response.body)
  process.exit(1)
})
