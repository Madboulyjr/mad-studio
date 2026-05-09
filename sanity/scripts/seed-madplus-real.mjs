#!/usr/bin/env node
/**
 * Seed the MAD+ section with REAL releases pulled from Spotify.
 *
 * Source: https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy
 * (data extracted from the public embed page — no API key needed)
 *
 * What this does:
 *   1. Downloads each track's cover artwork (640×640) from Spotify CDN
 *      → uploads to Sanity assets so we self-host the images
 *   2. Downloads the featured track's 30-second preview MP3
 *      → uploads to Sanity as a file asset for the inline player
 *   3. Patches section-music with:
 *      - featuredRelease  → "Boy Zacaria - Remix" (with cover + audio preview)
 *      - releases[]       → the other 4 tracks (cover + Spotify listenUrl)
 *
 * Result: refresh /madplus → real catalog with playable previews on the
 * featured hero card, and a real wall of cover tiles below.
 *
 * Usage: node sanity/scripts/seed-madplus-real.mjs
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

/* ─── Track catalog (extracted from Mad+Bouly's Spotify embed) ────
 * Order = Spotify's "top tracks" ranking, so #0 is the most popular
 * → we treat that as the featured release. The Spotify CDN cover URLs
 * use a sized variant pattern: ab67616d00001e02… (300px) → swap the
 * size code to ab67616d0000b273 (640px) for higher quality. */
const SIZE_300 = 'ab67616d00001e02'
const SIZE_640 = 'ab67616d0000b273'
const upsize = (url) => url.replace(SIZE_300, SIZE_640)

const TRACKS = [
  {
    id: '35NLqVDFu7CUOnf4GOQTrb',
    title: 'Boy Zacaria',
    subtitle: 'Remix',
    durationMs: 180560,
    thumb: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e026659f502a63ce772c89df1d4',
    preview: 'https://p.scdn.co/mp3-preview/a5c804938450d4334c0620ffa15bac4e8bc549e1',
  },
  {
    id: '4Hb7u3h6xGiqhOR7R5UqOc',
    title: 'Thunder',
    subtitle: '',
    durationMs: 180719,
    thumb: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0255b159dbef701f4f4d26cf5c',
    preview: 'https://p.scdn.co/mp3-preview/efd529481f16705b1c6f9f7b47f9f98fc6d3d790',
  },
  {
    id: '6fYlZf0bgaydSj5c2WGbFh',
    title: 'Take Me Higher',
    subtitle: '',
    durationMs: 256838,
    thumb: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f152939d08f5c15ae7f80eed',
    preview: 'https://p.scdn.co/mp3-preview/48281cde4609b5d5c8355c10eb94fcd2529885b2',
  },
  {
    id: '1LXmQ2YYrENYdNhZ9TmSGj',
    title: 'Ee Bwana',
    subtitle: 'Afrobeat',
    durationMs: 134058,
    thumb: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0214b31e77cb2586adf3b7a4d4',
    preview: 'https://p.scdn.co/mp3-preview/a58fb6bf4572f567fa8582e7e73e9c72d3954137',
  },
  {
    id: '0GIQoLeR4PQVadJmwkwMY8',
    // Arabic-only title — keep original glyphs for the wall
    title: 'نعيم الوعي',
    subtitle: '',
    durationMs: 134391,
    thumb: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02c242f5493c2d307cab1f95a0',
    preview: 'https://p.scdn.co/mp3-preview/7b99f6d5b40a3611662f780f45b47c76460b3ab5',
  },
]

const ARTIST_SPOTIFY_URL = 'https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy?si=WI8kEHFSTzq07Mh9orPeiA'
const APPLE_FALLBACK = 'https://music.apple.com/us/artist/madbouly/1763009729'
const ANGHAMI_FALLBACK = 'https://play.anghami.com/artist/25197772'
const YOUTUBE_FALLBACK = 'https://www.youtube.com/channel/UCJCnMKiBxw5eTq489WUNYzg'

const trackUrl = (id) => `https://open.spotify.com/track/${id}`

/* ─── Helpers ────────────────────────────────────────────────── */

async function fetchBuffer(url) {
  const r = await fetch(url, {
    headers: {
      // Some Spotify CDN edges 403 without a UA header
      'User-Agent': 'Mozilla/5.0 (mad-studio seed)',
      Accept: '*/*',
    },
  })
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function uploadImage(buf, filename) {
  return await client.assets.upload('image', buf, {filename, contentType: 'image/jpeg'})
}

async function uploadAudio(buf, filename) {
  return await client.assets.upload('file', buf, {filename, contentType: 'audio/mpeg'})
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ─── Run ──────────────────────────────────────────────────────── */

async function main() {
  console.log('\n  Pulling 5 tracks from Mad+Bouly\'s Spotify catalog…\n')

  const enriched = []
  for (let i = 0; i < TRACKS.length; i++) {
    const t = TRACKS[i]
    const fullTitle = t.subtitle ? `${t.title} · ${t.subtitle}` : t.title
    console.log(`    [${i + 1}/${TRACKS.length}] ${fullTitle}`)
    // Cover (640px hi-res)
    const coverBuf = await fetchBuffer(upsize(t.thumb))
    const coverSlug = slugify(t.title || `track-${i + 1}`) || `track-${i + 1}`
    const coverAsset = await uploadImage(coverBuf, `madplus-${coverSlug}.jpg`)
    console.log(`         cover  ✓  ${coverAsset._id}  (${(coverBuf.length / 1024).toFixed(1)} KB)`)

    // Audio preview (only for the featured track #0 to keep Sanity asset bill light)
    let audioAsset = null
    if (i === 0 && t.preview) {
      const audioBuf = await fetchBuffer(t.preview)
      audioAsset = await uploadAudio(audioBuf, `madplus-${coverSlug}-preview.mp3`)
      console.log(`         audio  ✓  ${audioAsset._id}  (${(audioBuf.length / 1024).toFixed(1)} KB · 30s preview)`)
    }

    enriched.push({...t, coverAsset, audioAsset, fullTitle})
  }

  // ─── Build the patch ──────────────────────────────────────────
  const featured = enriched[0]
  const rest = enriched.slice(1)

  const patch = {
    featuredRelease: {
      kicker: 'TOP TRACK',
      title: featured.fullTitle,
      subtitle: 'by MAD',
      year: '',
      label: 'Single',
      cover: {
        _type: 'image',
        asset: {_type: 'reference', _ref: featured.coverAsset._id},
      },
      ...(featured.audioAsset
        ? {
            previewAudio: {
              _type: 'file',
              asset: {_type: 'reference', _ref: featured.audioAsset._id},
            },
          }
        : {}),
      platforms: [
        {_key: 'fr-spotify', platform: 'spotify', url: trackUrl(featured.id)},
        {_key: 'fr-apple', platform: 'apple-music', url: APPLE_FALLBACK},
        {_key: 'fr-anghami', platform: 'anghami', url: ANGHAMI_FALLBACK},
        {_key: 'fr-youtube', platform: 'youtube', url: YOUTUBE_FALLBACK},
      ],
    },
    releases: rest.map((t, i) => ({
      _key: `rl-${slugify(t.title)}-${i}`,
      title: t.fullTitle,
      year: '',
      kind: 'Single',
      listenUrl: trackUrl(t.id),
      cover: {
        _type: 'image',
        asset: {_type: 'reference', _ref: t.coverAsset._id},
      },
    })),
  }

  console.log('\n  Patching section-music with real catalog…\n')
  await client.patch('section-music').set(patch).commit()

  console.log(`  ✓ Featured: "${featured.fullTitle}" (with playable 30s preview)`)
  console.log(`  ✓ ${rest.length} tracks on the wall`)
  console.log('\n  Refresh https://beingmad.co/madplus to see your real catalog live.\n')
}

main().catch((err) => {
  console.error('\n  ✗ Seed failed:', err.message || err)
  process.exit(1)
})
