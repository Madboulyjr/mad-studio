#!/usr/bin/env node
/**
 * Denormalise the Mux playbackId + assetId onto each videoItem in
 * project.media[]. Required because Sanity now returns
 * `reason: permission` for mux.videoAsset wrapper docs on anonymous
 * reads, so the public frontend's `video.asset->playbackId` traversal
 * always resolves to null — videos don't render.
 *
 * After running this:
 *   - every videoItem has `playbackId` + `assetId` baked on the item
 *   - the frontend GROQ's `coalesce(playbackId, video.asset->playbackId)`
 *     resolves the inline value (no traversal needed)
 *   - <mux-player> renders normally
 *
 * Idempotent — videoItems that already have a playbackId are skipped.
 *
 * Usage: node sanity/scripts/backfill-mux-playback.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({path: path.resolve(__dirname, '../../.env.local')})

const {SANITY_WRITE_TOKEN, MUX_TOKEN_ID, MUX_TOKEN_SECRET} = process.env
if (!SANITY_WRITE_TOKEN) {
  console.error('  ✗ Missing SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}
if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error('  ✗ Missing MUX_TOKEN_ID / MUX_TOKEN_SECRET in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: SANITY_WRITE_TOKEN,
  useCdn: false,
})

const muxAuth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')
async function muxAsset(id) {
  const r = await fetch(`https://api.mux.com/video/v1/assets/${id}`, {
    headers: {Authorization: `Basic ${muxAuth}`},
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error?.messages?.join('; ') || `Mux /assets/${id} → ${r.status}`)
  return json.data
}

console.log('\n  Fetching projects with videoItems…')
const projects = await client.fetch(`
  *[_type == "project" && count(media[_type == "videoItem"]) > 0]{
    _id, title,
    "slug": slug.current,
    media
  }
`)
console.log(`  Found ${projects.length} project(s) with videos.\n`)

let updated = 0, skipped = 0, failed = 0
for (const p of projects) {
  let changed = false
  const nextMedia = []
  for (const item of p.media || []) {
    if (item._type !== 'videoItem') { nextMedia.push(item); continue }
    if (item.playbackId) {
      console.log(`  ${p.title} → ${item._key}  ↷ already has playbackId (skipped)`)
      skipped++
      nextMedia.push(item)
      continue
    }
    const ref = item.video?.asset?._ref || ''
    const muxAssetId = ref.replace(/^mux\.videoAsset-/, '')
    if (!muxAssetId) {
      console.log(`  ${p.title} → ${item._key}  – no asset _ref (skipped)`)
      skipped++
      nextMedia.push(item)
      continue
    }
    try {
      const asset = await muxAsset(muxAssetId)
      const playbackId = asset.playback_ids?.[0]?.id || null
      if (!playbackId) throw new Error('asset has no playback_ids')
      nextMedia.push({
        ...item,
        playbackId,
        assetId: asset.id,
      })
      console.log(`  ${p.title} → ${item._key}  ✓ playbackId=${playbackId.slice(0, 16)}…`)
      updated++
      changed = true
    } catch (e) {
      console.log(`  ${p.title} → ${item._key}  ✗ ${e.message}`)
      nextMedia.push(item)
      failed++
    }
  }
  if (changed) {
    await client.patch(p._id).set({media: nextMedia}).commit()
  }
}

console.log(`\n  Done. updated=${updated}, skipped=${skipped}, failed=${failed}\n`)
console.log('  Refresh any project page on the site — videos should render now.\n')
