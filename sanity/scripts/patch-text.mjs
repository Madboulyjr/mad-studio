#!/usr/bin/env node
/**
 * Patches text-only fields (caption, lead, etc.) on existing docs in Sanity.
 * Skips image re-upload. Idempotent.
 *
 * Usage: node sanity/scripts/patch-text.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {SECTIONS, ORIGINALS_PROJECTS} from './seed-data.mjs'

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
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})

async function patchSections() {
  console.log('\nPatching sections (text only)…')
  for (const s of SECTIONS) {
    await client
      .patch(`section-${s.slug}`)
      .set({
        manifesto: s.manifesto,
        lead: s.lead,
        landingHeadline: s.landingHeadline,
        landingSubtitle: s.landingSubtitle,
        kicker: s.kicker,
        worksLabel: s.worksLabel,
        worksTitle: s.worksTitle,
      })
      .commit()
    console.log(`  ✓ ${s.slug}`)
  }
}

async function patchProjects() {
  console.log('\nPatching projects (caption only)…')
  for (const p of ORIGINALS_PROJECTS) {
    await client
      .patch(`project-${p.slug}`)
      .set({caption: p.caption, year: p.year, tags: p.tags})
      .commit()
    console.log(`  ✓ ${p.slug}`)
  }
}

async function main() {
  await patchSections()
  await patchProjects()
  console.log('\n✓ Done.\n')
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err.message || err)
  process.exit(1)
})
