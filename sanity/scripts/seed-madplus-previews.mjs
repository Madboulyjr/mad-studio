#!/usr/bin/env node
/**
 * Upload preview MP3s for every non-featured release in section-music
 * so the carousel play button works on ALL tracks, not just the
 * featured one.
 *
 * Source for each preview URL: the Spotify CDN URLs already captured
 * in seed-madplus-real.mjs (https://p.scdn.co/mp3-preview/<id>). We
 * download each, upload it to Sanity as an audio asset, then patch
 * the matching item in section-music.releases[] with a reference to
 * the new asset.
 *
 * Idempotent — already-patched releases (those with previewAudio set
 * on Sanity) are skipped on re-run.
 *
 * Usage: node sanity/scripts/seed-madplus-previews.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

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

/* Match each release in Sanity to a preview URL. Keyed by the title
   substring that survives the seed script — keep these in sync if the
   release titles ever change in Sanity Studio. */
const PREVIEWS = [
  {match: /Boy Zacaria/i,    url: 'https://p.scdn.co/mp3-preview/a5c804938450d4334c0620ffa15bac4e8bc549e1', file: 'boy-zacaria'},
  {match: /Thunder/i,        url: 'https://p.scdn.co/mp3-preview/efd529481f16705b1c6f9f7b47f9f98fc6d3d790', file: 'thunder'},
  {match: /Take Me Higher/i, url: 'https://p.scdn.co/mp3-preview/48281cde4609b5d5c8355c10eb94fcd2529885b2', file: 'take-me-higher'},
  {match: /Ee Bwana/i,       url: 'https://p.scdn.co/mp3-preview/a58fb6bf4572f567fa8582e7e73e9c72d3954137', file: 'ee-bwana'},
]

async function fetchBuffer(url) {
  const r = await fetch(url, {
    headers: {'User-Agent': 'Mozilla/5.0 (mad-studio seed)', Accept: '*/*'},
  })
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function uploadAudio(buf, filename) {
  return await client.assets.upload('file', buf, {filename, contentType: 'audio/mpeg'})
}

async function main() {
  console.log('\n  Reading section-music.releases from Sanity…\n')
  const doc = await client.fetch(`*[_id == "section-music"][0]{releases}`)
  if (!doc || !Array.isArray(doc.releases)) {
    console.error('  ✗ section-music has no releases[] array')
    process.exit(1)
  }

  // Build new releases[] by walking each item, uploading audio when
  // missing, and merging the new previewAudio ref into the object.
  const next = []
  for (let i = 0; i < doc.releases.length; i++) {
    const r = doc.releases[i]
    const label = r.title || `release-${i}`

    if (r.previewAudio && r.previewAudio.asset && r.previewAudio.asset._ref) {
      console.log(`  · ${label}  ✓ already has previewAudio (skipped)`)
      next.push(r)
      continue
    }

    const match = PREVIEWS.find((p) => p.match.test(r.title || ''))
    if (!match) {
      console.log(`  · ${label}  – no preview URL mapped (skipped)`)
      next.push(r)
      continue
    }

    console.log(`  · ${label}  ↓ downloading ${match.url}`)
    const buf = await fetchBuffer(match.url)
    const asset = await uploadAudio(buf, `madplus-${match.file}-preview.mp3`)
    console.log(`            ✓ uploaded ${asset._id}  (${(buf.length / 1024).toFixed(1)} KB)`)

    next.push({
      ...r,
      previewAudio: {
        _type: 'file',
        asset: {_type: 'reference', _ref: asset._id},
      },
    })
  }

  console.log('\n  Patching section-music.releases…\n')
  await client.patch('section-music').set({releases: next}).commit()

  const newCount = next.filter((r) => r.previewAudio?.asset?._ref).length
  console.log(`\n  ✓ Done. ${newCount}/${next.length} releases now have inline previews.\n`)
}

main().catch((err) => {
  console.error('\n  ✗ Seed failed:', err.message || err)
  process.exit(1)
})
