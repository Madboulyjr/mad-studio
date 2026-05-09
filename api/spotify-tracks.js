/**
 * GET /api/spotify-tracks
 *
 * Fetches Madbouly's catalog from the Spotify Web API and returns it
 * as simple JSON for the /madplus page renderer:
 *
 *   {
 *     tracks: [{ id, title, year, coverUrl, listenUrl, previewUrl, durationMs }, ...],
 *     albums: [{ id, title, year, kind, coverUrl, listenUrl }, ...]
 *   }
 *
 * Auth: Spotify "client credentials" flow — no user login needed for
 * public artist data. Set these env vars on Vercel:
 *
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *
 * Get them from https://developer.spotify.com/dashboard (free tier,
 * no app review needed for the public-data endpoints we hit).
 *
 * Caching: 1 hour at Vercel edge (`s-maxage=3600`) + serve-stale-while-
 * revalidate for a day. Drops Spotify request count to ~24/day per
 * region — well under the 100/min/IP cap.
 *
 * If creds are missing or Spotify errors, the function still returns
 * 200 with empty arrays + an `error` field so the front-end gracefully
 * hides the block instead of breaking the page.
 */

// Madbouly's Spotify artist ID — same one already wired in
// sanity/scripts/seed-madplus.mjs.
const ARTIST_ID = '6wcaWzTRzPz0uGwF0Z54Jy'

// Module-scope token cache. Fluid Compute reuses instances so this
// survives across requests on the same warm function.
let _tokenCache = null

async function getAccessToken() {
  // Re-use cached token if still valid (1-min safety margin)
  if (_tokenCache && _tokenCache.expires > Date.now() + 60_000) {
    return _tokenCache.token
  }
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET env vars')
  }
  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Spotify token fetch failed (${r.status}): ${text.slice(0, 200)}`)
  }
  const j = await r.json()
  _tokenCache = {
    token: j.access_token,
    expires: Date.now() + (j.expires_in || 3600) * 1000,
  }
  return _tokenCache.token
}

async function spotifyGet(url, token) {
  const r = await fetch(url, {headers: {Authorization: `Bearer ${token}`}})
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Spotify API ${r.status} on ${url}: ${text.slice(0, 200)}`)
  }
  return r.json()
}

function bestImage(images) {
  if (!Array.isArray(images) || !images.length) return null
  // Spotify returns sizes 640 / 300 / 64 — pick the largest.
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0))
  return sorted[0].url
}

function albumKindLabel(album_type) {
  if (album_type === 'album') return 'Album'
  if (album_type === 'single') return 'Single'
  if (album_type === 'compilation') return 'Compilation'
  return 'Release'
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  // CDN cache so we don't pound Spotify on every page load.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  try {
    const token = await getAccessToken()

    const [albumsRes, topRes] = await Promise.all([
      spotifyGet(
        `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?limit=50&market=US&include_groups=album,single,ep`,
        token,
      ),
      spotifyGet(
        `https://api.spotify.com/v1/artists/${ARTIST_ID}/top-tracks?market=US`,
        token,
      ),
    ])

    const tracks = (topRes.tracks || []).slice(0, 12).map((t) => ({
      id: t.id,
      title: t.name,
      year: (t.album && t.album.release_date ? t.album.release_date.slice(0, 4) : ''),
      coverUrl: bestImage(t.album && t.album.images),
      listenUrl: t.external_urls && t.external_urls.spotify,
      previewUrl: t.preview_url || null, // 30s mp3 preview (may be null per market)
      durationMs: t.duration_ms || 0,
      explicit: !!t.explicit,
    }))

    // Deduplicate albums by name (Spotify returns market variants),
    // sort newest-first.
    const seen = new Set()
    const albums = (albumsRes.items || [])
      .filter((a) => {
        const key = (a.name || '').toLowerCase().trim()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
      .map((a) => ({
        id: a.id,
        title: a.name,
        year: (a.release_date || '').slice(0, 4),
        kind: albumKindLabel(a.album_type),
        coverUrl: bestImage(a.images),
        listenUrl: a.external_urls && a.external_urls.spotify,
        totalTracks: a.total_tracks || 0,
      }))

    res.statusCode = 200
    res.end(JSON.stringify({tracks, albums, fetchedAt: new Date().toISOString()}))
  } catch (e) {
    // Soft-fail: front-end gracefully hides the block when arrays are empty.
    res.statusCode = 200
    res.end(
      JSON.stringify({
        tracks: [],
        albums: [],
        error: e.message || 'Spotify fetch failed',
      }),
    )
  }
}
