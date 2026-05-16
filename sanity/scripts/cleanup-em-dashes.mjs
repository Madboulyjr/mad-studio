#!/usr/bin/env node
/**
 * Replace " — " (space em-dash space) with ". " in every paragraph
 * field on Sanity. Capitalizes the first letter after each replacement
 * so the resulting prose reads naturally.
 *
 * Touched fields:
 *   project.caption
 *   project.caseStudy.problem
 *   section.lead
 *   section.manifesto
 *   siteSettings.manifestoBody
 *
 * Skips fields without an em-dash so the script can be re-run safely
 * (idempotent). Prints a before/after diff for every field touched.
 *
 * Usage: node sanity/scripts/cleanup-em-dashes.mjs
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

/* Em-dash → period with smart capitalization of the next word.
   Also handles em-dash directly preceded by a closing quote/period
   (cleans up the trailing punctuation in those cases). */
function normalize(text) {
  if (!text || typeof text !== 'string') return text
  let out = text
  // " — " in the middle of a sentence → ". " + capitalize next letter
  out = out.replace(/(\S)\s*—\s*([a-zA-Z])/g, (m, prev, next) => {
    // If prev is closing quote or period, drop the period (avoid '". X')
    const sep = /[.!?]/.test(prev) ? ' ' : '. '
    return `${prev}${sep}${next.toUpperCase()}`
  })
  // Stray em-dash at the very start or end of a chunk → drop
  out = out.replace(/^—\s*/g, '').replace(/\s*—$/g, '')
  // Any leftover em-dashes (non-spaced) → comma
  out = out.replace(/\s*—\s*/g, ', ')
  // Collapse double spaces / clean trailing whitespace
  out = out.replace(/\s{2,}/g, ' ').trim()
  return out
}

const q = `*[
  (_type == "project" && (defined(caption) || defined(caseStudy.problem))) ||
  (_type == "section" && (defined(lead) || defined(manifesto))) ||
  (_type == "siteSettings" && defined(manifestoBody))
]{
  _id, _type, title,
  caption,
  "problem": caseStudy.problem,
  lead, manifesto, manifestoBody
}`

console.log('\n  Fetching docs from Sanity…\n')
const docs = await client.fetch(q)

let touched = 0
for (const d of docs) {
  const fields = {
    caption: d.caption,
    problem: d.problem,
    lead: d.lead,
    manifesto: d.manifesto,
    manifestoBody: d.manifestoBody,
  }
  const setPatch = {}
  for (const [key, val] of Object.entries(fields)) {
    if (!val || typeof val !== 'string') continue
    if (!val.includes('—')) continue // skip clean ones
    const next = normalize(val)
    if (next === val) continue
    // Map "problem" back to nested path
    const path = key === 'problem' ? 'caseStudy.problem' : key
    setPatch[path] = next
  }
  if (!Object.keys(setPatch).length) continue
  const label = d.title || d._id
  console.log(`  · ${d._type} → ${label}`)
  for (const [k, v] of Object.entries(setPatch)) {
    const orig = fields[k.split('.').pop()] || ''
    console.log(`     ${k}:`)
    console.log(`       BEFORE: ${orig.slice(0, 160)}${orig.length > 160 ? '…' : ''}`)
    console.log(`       AFTER:  ${v.slice(0, 160)}${v.length > 160 ? '…' : ''}`)
    console.log()
  }
  await client.patch(d._id).set(setPatch).commit()
  touched++
}

console.log(`\n  ✓ Patched ${touched} doc(s). Em-dashes removed from paragraph copy.\n`)
