#!/usr/bin/env node
/**
 * Populate the MAD+ section (slug: "music") with music platform data:
 *   - musicEmbed: Spotify artist embed
 *   - musicPlatforms: Spotify, Apple Music, YouTube, Anghami
 *   - instagramMusic: @madbovlly
 *
 * URLs sourced from https://linktr.ee/Mad.bouly
 *
 * Usage: node sanity/scripts/seed-madplus.mjs
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

const patch = {
  musicEmbed: {
    type: 'spotify',
    embedUrl: 'https://open.spotify.com/artist/1rgIIBUadDr57yF2gMfHlv',
    caption: 'Listen on Spotify',
  },
  musicPlatforms: [
    {
      _key: 'platform-spotify',
      platform: 'spotify',
      url: 'https://open.spotify.com/artist/1rgIIBUadDr57yF2gMfHlv?si=q5JbXLsFS26lf8AHKXkbmg',
    },
    {
      _key: 'platform-apple-music',
      platform: 'apple-music',
      url: 'https://music.apple.com/us/artist/madbouly/1763009729',
    },
    {
      _key: 'platform-youtube',
      platform: 'youtube',
      url: 'https://www.youtube.com/channel/UCJCnMKiBxw5eTq489WUNYzg',
    },
    {
      _key: 'platform-anghami',
      platform: 'anghami',
      url: 'https://play.anghami.com/artist/25197772',
    },
  ],
  instagramMusic: {
    handle: 'madbovlly',
    url: 'https://instagram.com/madbovlly',
  },
}

console.log('\nPushing MAD+ music data to section-music…\n')
for (const [k, v] of Object.entries(patch)) {
  if (Array.isArray(v)) console.log(`  ${k}: ${v.length} platforms`)
  else console.log(`  ${k}:`, v.embedUrl || v.handle || v)
}

await client.patch('section-music').set(patch).commit()
console.log('\n✓ Done. /madplus will show the music block on next page load.\n')
