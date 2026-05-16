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
  console.error('  ✗ Missing SANITY_WRITE_TOKEN'); process.exit(1)
}

// Find Google Arabia
const gp = await client.fetch(`*[_type=="project" && title=="Google Arabia"][0]{_id, title, "awards": caseStudy.awards}`)
if (!gp) {console.error('  ✗ Google Arabia not found'); process.exit(1)}

console.log('  Before:', gp.title, '·', gp.awards || '(no awards)')

// Patch a sample award onto Google Arabia
await client
  .patch(gp._id)
  .set({
    'caseStudy.awards': ['Behance Featured 2018', 'Dubai Lynx Bronze 2019'],
  })
  .commit()

const after = await client.fetch(`*[_id==$id][0]{title, "awards": caseStudy.awards}`, {id: gp._id})
console.log('  After: ', after.title, '·', after.awards.join(' · '))
console.log('\n  ✓ Done. Refresh /originals — Google Arabia should show a gold seal.')
