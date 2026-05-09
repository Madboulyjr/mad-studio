#!/usr/bin/env node
/** Check MAD+ section's music fields state in Sanity. */
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
  useCdn: false,
})

const data = await client.fetch(`*[_type == "section" && slug.current == "music"][0]{
  _id, title,
  "hasEmbed": defined(musicEmbed.embedUrl),
  musicEmbed,
  "platformCount": count(musicPlatforms),
  musicPlatforms,
  instagramMusic
}`)
console.log('\nMAD+ music fields state:\n')
console.log(JSON.stringify(data, null, 2))
