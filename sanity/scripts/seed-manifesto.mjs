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
if (!process.env.SANITY_WRITE_TOKEN) {console.error('Missing token'); process.exit(1)}

const settings = await client.fetch(`*[_type == "siteSettings"][0]{_id}`)
if (!settings) {console.error('No siteSettings doc'); process.exit(1)}

await client.patch(settings._id).set({
  manifestoTitle: 'Creativity is <em>madness</em><br>with a deadline.',
  manifestoBody: `Nine years building loud worlds for clients across the region — launching Google Arabia, Vodafone RED rollouts, Mazda re-launches, Mondelez packaging.\n\n<strong>The work doesn't whisper.</strong> It picks a fight with the scroll, makes the brief feel small, and earns its place in the feed by being the thing nobody saw coming.\n\nTrained at AKQA, FP7, Acquaint and Socialeyez. Now operating on my own terms — running MAD Studio across Originals, Bubble, MAD+ music and Vision film.`,
  manifestoStats: [
    {_key: 'st1', value: '9', label: 'Years in the game'},
    {_key: 'st2', value: '4', label: 'Agencies trained at'},
    {_key: 'st3', value: '200+', label: 'Campaigns shipped'},
    {_key: 'st4', value: '4', label: 'Studio sections'},
  ],
  awardsWon: [
    {_key: 'aw1', title: '— add your wins via /admin →', organization: 'Site Settings', year: '2026', project: 'Add real awards here'},
  ],
  awardsShortlisted: [
    {_key: 'sh1', title: '— add shortlists via /admin →', organization: 'Site Settings', year: '2026'},
  ],
  pressFeatures: [
    {_key: 'pr1', outlet: 'Behance', year: '2024', title: 'Featured work'},
  ],
}).commit()
console.log('  ✓ Manifesto seeded')
