#!/usr/bin/env node
/**
 * Recover orphan videoItem references in projects by re-creating the
 * mux.videoAsset Sanity wrapper docs that the references point to.
 *
 * Background: at some point the mux.videoAsset docs in Sanity got
 * purged (or were never created cleanly). The project.media[]
 * videoItem entries still reference them by `_ref`, but
 * `video.asset->playbackId` resolves to null because the doc isn't
 * there. The Mux assets themselves are intact and ready — we just
 * need to recreate the Sanity wrappers so the GROQ query resolves
 * a playback ID and the frontend can render the <mux-player>.
 *
 * What this does:
 *   1. Find every project with a videoItem that references a
 *      mux.videoAsset that doesn't exist in Sanity.
 *   2. For each missing ref, pull the asset from Mux directly.
 *   3. createIfNotExists() a mux.videoAsset doc mirroring what
 *      sanity-plugin-mux-input would create.
 *
 * Idempotent — already-existing docs are skipped.
 *
 * Required env (loaded from .env.local):
 *   SANITY_WRITE_TOKEN
 *   MUX_TOKEN_ID
 *   MUX_TOKEN_SECRET
 *
 * Usage: node sanity/scripts/recover-mux-videos.mjs
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
async function muxFetch(p) {
  const r = await fetch(`https://api.mux.com${p}`, {
    headers: {Authorization: `Basic ${muxAuth}`},
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error?.messages?.join('; ') || `Mux ${p} → ${r.status}`)
  return json.data
}

console.log('\n  1. Collecting videoItem refs from every project…')
const refs = await client.fetch(`
  *[_type == "project" && defined(media)]{
    title,
    "slug": slug.current,
    "videoRefs": media[_type == "videoItem"].video.asset._ref
  }[count(videoRefs) > 0]
`)
const allRefs = new Set()
for (const p of refs) for (const r of p.videoRefs || []) if (r) allRefs.add(r)
console.log(`     Found ${allRefs.size} unique mux.videoAsset refs across ${refs.length} project(s).\n`)

console.log('  2. Checking which Sanity wrapper docs are missing…')
const existing = await client.fetch(`*[_id in $ids]._id`, {ids: [...allRefs]})
const missing = [...allRefs].filter((id) => !existing.includes(id))
console.log(`     ${existing.length} already exist. ${missing.length} are missing — fetching from Mux.\n`)

if (!missing.length) {
  console.log('  ✓ Nothing to do. Every videoItem ref already has a Sanity wrapper doc.\n')
  process.exit(0)
}

console.log('  3. Pulling missing assets from Mux + recreating Sanity docs…')
let created = 0, failed = 0, skipped = 0
for (const ref of missing) {
  // ref pattern: "mux.videoAsset-<MUX_ASSET_ID>"
  const muxAssetId = ref.replace(/^mux\.videoAsset-/, '')
  try {
    const asset = await muxFetch(`/video/v1/assets/${muxAssetId}`)
    if (!asset) {
      console.log(`     – ${ref}  (not found on Mux — skipped)`)
      skipped++
      continue
    }
    const playbackId = asset.playback_ids?.[0]?.id || null
    await client.createIfNotExists({
      _id: ref,
      _type: 'mux.videoAsset',
      assetId: asset.id,
      playbackId,
      status: asset.status || 'ready',
      filename: asset.tracks?.[0]?.name || `recovered-${muxAssetId}.mp4`,
      data: asset,
    })
    console.log(`     ✓ ${ref}  →  playbackId=${playbackId}`)
    created++
  } catch (e) {
    console.log(`     ✗ ${ref}  →  ${e.message}`)
    failed++
  }
}

console.log(`\n  Done. created=${created}, skipped=${skipped}, failed=${failed}\n`)
console.log('  Now refresh any project page on the site — the videos should render.\n')
