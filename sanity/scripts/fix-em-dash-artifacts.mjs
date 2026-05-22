#!/usr/bin/env node
/**
 * Fix awkward leftovers from the earlier em-dash cleanup script.
 *
 * The pattern: a phrase like "language — 3D viz" got turned into
 * "language., 3D viz" because the regex didn't notice the comma that
 * had been there originally. There may be others — this script
 * scans every paragraph field for the broken patterns and fixes
 * them in place.
 *
 * Patterns repaired:
 *   "., "   → ", "    (period-comma was meant to be just a comma)
 *   ".,"    → ","     (no space variant)
 *   "..,"   → "."     (double-period before comma)
 *   ". ."   → "."     (double-period with space)
 *   ".. "   → ". "    (accidental double-period)
 *
 * Touches: project.caption, project.caseStudy.problem,
 *          section.lead, section.manifesto,
 *          siteSettings.manifestoBody
 *
 * Idempotent — fields without any artifact are skipped.
 *
 * Usage: node sanity/scripts/fix-em-dash-artifacts.mjs
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

function fix(text) {
  if (!text || typeof text !== 'string') return text
  let out = text
  out = out.replace(/\.,\s+/g, ', ')   // "., " → ", "
  out = out.replace(/\.,/g, ',')        // ".," → ","  (no-space variant)
  out = out.replace(/\.\.,/g, '.')      // "..," → "."  (double-period before comma)
  out = out.replace(/\.\s\.\s/g, '. ')  // ". . " → ". "
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
    const next = fix(val)
    if (next === val) continue
    const sanityPath = key === 'problem' ? 'caseStudy.problem' : key
    setPatch[sanityPath] = next
  }
  if (!Object.keys(setPatch).length) continue
  const label = d.title || d._id
  console.log(`  · ${d._type} → ${label}`)
  for (const [k, v] of Object.entries(setPatch)) {
    const origKey = k.split('.').pop()
    const orig = fields[origKey] || ''
    // Show only the snippet that contains the artifact
    const beforeIdx = orig.search(/\.,/)
    const afterIdx = v.search(/\.,/)
    const snippet = beforeIdx >= 0 ? orig.slice(Math.max(0, beforeIdx - 30), beforeIdx + 30) : orig.slice(0, 80)
    const snippet2 = beforeIdx >= 0 ? v.slice(Math.max(0, beforeIdx - 30), beforeIdx + 30) : v.slice(0, 80)
    console.log(`     ${k}:`)
    console.log(`       BEFORE: …${snippet}…`)
    console.log(`       AFTER:  …${snippet2}…`)
  }
  await client.patch(d._id).set(setPatch).commit()
  touched++
  console.log()
}

console.log(`\n  ✓ Patched ${touched} doc(s).\n`)
