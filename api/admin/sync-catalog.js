/**
 * POST /api/admin/sync-catalog
 *
 * Pulls the artist's full release catalog from the **Deezer API** (free, no
 * auth, no API key) and rewrites the MAD+ section (`section-music`) so the
 * newest release is the featured hero and everything else fills the releases
 * wall — covers and all. Releases are the same across every store because
 * DistroKid distributes them everywhere; Deezer is just the free, open data
 * source we read from.
 *
 * Idempotent: each run REPLACES featuredRelease + releases[] with the current
 * catalog, so re-syncing never duplicates entries. Cover artwork is only
 * re-uploaded for releases we haven't seen before (matched by the `extId` we
 * stamp on each entry), keeping the Sanity asset bill flat across syncs.
 *
 * Auth: admin session cookie (same gate as the other admin endpoints).
 * Env:  DEEZER_ARTIST_ID (optional, defaults to Mad+Bouly = 337295711)
 *
 * Note: Deezer exposes per-release links + cover art. The featured card's
 * platform pills (Spotify / Apple / Anghami / YouTube) stay artist-level
 * since those per-release URLs aren't available from a keyless source.
 */
import {requireAuth, sanityClient, jsonResponse} from './_lib.js'

const ARTIST_ID = process.env.DEEZER_ARTIST_ID || '337295711'
const SECTION_ID = 'section-music'

// Artist-level platform links for the featured hero's pills.
const SPOTIFY_ARTIST = 'https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy'
const APPLE_ARTIST = 'https://music.apple.com/us/artist/madbouly/1763009729'
const ANGHAMI_ARTIST = 'https://play.anghami.com/artist/25197772'
const YOUTUBE_ARTIST = 'https://www.youtube.com/channel/UCJCnMKiBxw5eTq489WUNYzg'

/* ─── Deezer API (keyless, public) ─────────────────────────────── */
async function deezerGet(url) {
  const r = await fetch(url, {headers: {Accept: 'application/json'}})
  if (!r.ok) throw new Error(`Deezer GET ${url} → ${r.status}`)
  const j = await r.json()
  if (j && j.error) throw new Error(`Deezer error: ${j.error.message || JSON.stringify(j.error)}`)
  return j
}

/* All of the artist's releases, newest first. Deezer paginates via `next`. */
async function fetchReleases() {
  let url = `https://api.deezer.com/artist/${ARTIST_ID}/albums?limit=100`
  const items = []
  while (url) {
    const data = await deezerGet(url)
    if (Array.isArray(data.data)) items.push(...data.data)
    url = data.next || null
  }
  // De-dup by title (a release can appear more than once across variants).
  const byTitle = new Map()
  for (const a of items) {
    const key = (a.title || '').trim().toLowerCase()
    if (!key) continue
    const prev = byTitle.get(key)
    if (!prev || (a.release_date || '') > (prev.release_date || '')) byTitle.set(key, a)
  }
  return [...byTitle.values()].sort((x, y) =>
    (y.release_date || '').localeCompare(x.release_date || ''),
  )
}

/* ─── Sanity asset helpers ─────────────────────────────────────── */
async function fetchBuffer(url) {
  const r = await fetch(url, {headers: {'User-Agent': 'mad-studio sync', Accept: '*/*'}})
  if (!r.ok) throw new Error(`cover fetch ${url} → ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

function slugify(s) {
  return (
    String(s || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'track'
  )
}

const coverUrl = (a) => a.cover_xl || a.cover_big || a.cover_medium || a.cover || null
const yearOf = (a) => (a.release_date || '').slice(0, 4)
const kindOf = (a) => {
  const t = (a.record_type || 'single').toLowerCase()
  if (t === 'album') return 'Album'
  if (t === 'ep') return 'EP'
  return 'Single'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, {error: 'Method not allowed'})
  if (!requireAuth(req, res)) return

  try {
    const releasesRaw = await fetchReleases()
    if (!releasesRaw.length) {
      return jsonResponse(res, 200, {ok: true, total: 0, newCovers: 0, message: 'No releases found on Deezer'})
    }

    const client = sanityClient()

    // Reuse already-uploaded cover assets, keyed by the extId we stamped on
    // previous syncs — avoids re-uploading the same artwork every run.
    const existing = await client.fetch(`*[_id == $id][0]{featuredRelease, releases}`, {id: SECTION_ID})
    const coverById = new Map()
    const remember = (item) => {
      if (item && item.extId && item.cover && item.cover.asset && item.cover.asset._ref) {
        coverById.set(String(item.extId), item.cover)
      }
    }
    remember(existing && existing.featuredRelease)
    ;(existing && existing.releases ? existing.releases : []).forEach(remember)

    let newCovers = 0
    async function ensureCover(album) {
      const key = String(album.id)
      if (coverById.has(key)) return coverById.get(key)
      const url = coverUrl(album)
      if (!url) return null
      const buf = await fetchBuffer(url)
      const asset = await client.assets.upload('image', buf, {
        filename: `madplus-${slugify(album.title)}.jpg`,
        contentType: 'image/jpeg',
      })
      newCovers++
      const cover = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
      coverById.set(key, cover)
      return cover
    }

    const [featuredAlbum, ...restAlbums] = releasesRaw

    const featuredCover = await ensureCover(featuredAlbum)
    const featuredRelease = {
      kicker: 'LATEST RELEASE',
      title: featuredAlbum.title,
      subtitle: 'by MAD',
      year: yearOf(featuredAlbum),
      label: kindOf(featuredAlbum),
      extId: String(featuredAlbum.id),
      ...(featuredCover ? {cover: featuredCover} : {}),
      platforms: [
        {_key: 'fr-spotify', platform: 'spotify', url: SPOTIFY_ARTIST},
        {_key: 'fr-apple', platform: 'apple-music', url: APPLE_ARTIST},
        {_key: 'fr-anghami', platform: 'anghami', url: ANGHAMI_ARTIST},
        {_key: 'fr-youtube', platform: 'youtube', url: YOUTUBE_ARTIST},
      ],
    }

    const releases = []
    for (const a of restAlbums) {
      const cover = await ensureCover(a)
      releases.push({
        _key: `rl-${a.id}`,
        title: a.title,
        year: yearOf(a),
        kind: kindOf(a),
        listenUrl: a.link || '',
        extId: String(a.id),
        ...(cover ? {cover} : {}),
      })
    }

    await client.patch(SECTION_ID).set({featuredRelease, releases}).commit()

    return jsonResponse(res, 200, {
      ok: true,
      total: releasesRaw.length,
      featured: featuredAlbum.title,
      releasesCount: releases.length,
      newCovers,
    })
  } catch (e) {
    return jsonResponse(res, 500, {error: (e && e.message) || 'Sync failed'})
  }
}
