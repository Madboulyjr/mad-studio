#!/usr/bin/env node
/**
 * Set `autoplay: false` on every videoItem in every project. Defaults
 * flipped from "autoplay muted on load" → "show poster + controls,
 * wait for click" everywhere. Editors can opt specific clips back in
 * via Sanity Studio if they want ambient looping intros.
 *
 * Idempotent — items already at autoplay:false are skipped.
 *
 * Usage: node sanity/scripts/disable-autoplay.mjs
 */
import {createClient} from '@sanity/client'
import dotenv from 'dotenv'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({path: path.resolve(__dirname, '../../.env.local')})

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error('  ✗ Missing SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

console.log('\n  Fetching projects with videoItems…')
const projects = await client.fetch(`
  *[_type == "project" && count(media[_type == "videoItem"]) > 0]{
    _id, title, media
  }
`)

let projectsTouched = 0, itemsFlipped = 0, itemsSkipped = 0
for (const p of projects) {
  let changed = false
  const nextMedia = (p.media || []).map((m) => {
    if (m._type !== 'videoItem') return m
    if (m.autoplay === false) { itemsSkipped++; return m }
    itemsFlipped++
    changed = true
    return {...m, autoplay: false}
  })
  if (changed) {
    await client.patch(p._id).set({media: nextMedia}).commit()
    projectsTouched++
    console.log(`  ✓ ${p.title}  (${nextMedia.filter((m) => m._type === 'videoItem').length} video item(s))`)
  }
}

console.log(`\n  Done. projects=${projectsTouched}, flipped=${itemsFlipped}, already-off=${itemsSkipped}\n`)
