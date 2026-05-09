/**
 * POST /api/admin/video/finalize?uploadId=X
 *
 * Step 3 of Mux Direct Upload flow (Step 2 = client PUT to uploadUrl):
 *   Polls Mux for the upload to be processed → asset_id → playback_id.
 *   Then creates a Sanity mux.videoAsset doc that wraps the Mux asset
 *   so the project schema's videoItem.video field can reference it.
 *
 * Returns: { ok: true, videoAsset: {_id, playbackId, assetId}, _key }
 *   The client uses this to insert a videoItem into the project's
 *   media[] array on the next save.
 *
 * Polling: max 50s on Vercel default (serverless 60s timeout - 10s buffer).
 * Most videos under 1 min process in ~30s. Larger files may need a webhook
 * model — for now we surface a "still processing, reload later" state.
 */
import {requireAuth, sanityClient, jsonResponse} from './_lib.js'

// Allow up to 60s for this function (Vercel max for hobby is 10s, pro is 60s)
export const config = {
  maxDuration: 60,
}

const POLL_INTERVAL_MS = 1500
const POLL_MAX_MS = 50000

async function muxFetch(path, tokenId, tokenSecret) {
  const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')
  const r = await fetch(`https://api.mux.com${path}`, {
    headers: {Authorization: `Basic ${auth}`},
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error?.messages?.join('; ') || `Mux ${path} returned ${r.status}`)
  return json.data
}

async function pollForAsset(uploadId, tokenId, tokenSecret) {
  const start = Date.now()
  let upload, asset
  while (Date.now() - start < POLL_MAX_MS) {
    upload = await muxFetch(`/video/v1/uploads/${uploadId}`, tokenId, tokenSecret)
    if (upload.status === 'errored') {
      throw new Error(`Mux upload errored: ${upload.error?.message || 'unknown'}`)
    }
    if (upload.asset_id) {
      asset = await muxFetch(`/video/v1/assets/${upload.asset_id}`, tokenId, tokenSecret)
      if (asset.status === 'ready') return asset
      if (asset.status === 'errored') throw new Error('Mux asset processing errored')
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  // Timed out — return whatever we have
  return asset || (upload?.asset_id ? {id: upload.asset_id, status: 'preparing'} : null)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, {error: 'Method not allowed'})
  if (!requireAuth(req, res)) return

  const url = new URL(req.url, 'http://x')
  const uploadId = url.searchParams.get('uploadId')
  if (!uploadId) return jsonResponse(res, 400, {error: 'Missing ?uploadId'})

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET
  if (!tokenId || !tokenSecret) {
    return jsonResponse(res, 500, {error: 'Mux credentials not configured'})
  }

  let asset
  try {
    asset = await pollForAsset(uploadId, tokenId, tokenSecret)
  } catch (e) {
    return jsonResponse(res, 500, {error: e.message})
  }

  if (!asset || !asset.id) {
    return jsonResponse(res, 504, {
      error: 'Video still processing on Mux. Try again in ~30s.',
      status: 'preparing',
    })
  }

  const playbackId = asset.playback_ids?.[0]?.id || null

  // Create a Sanity mux.videoAsset doc that mirrors what sanity-plugin-mux-input
  // would create. The project's videoItem.video field references this doc.
  const client = sanityClient()
  const sanityDocId = `mux.videoAsset-${asset.id}`
  try {
    await client.createIfNotExists({
      _id: sanityDocId,
      _type: 'mux.videoAsset',
      assetId: asset.id,
      playbackId,
      status: asset.status || 'ready',
      filename: asset.tracks?.[0]?.name || `video-${asset.id}.mp4`,
      data: asset, // full Mux asset metadata for plugin compatibility
      uploadId,
    })
  } catch (e) {
    return jsonResponse(res, 500, {error: 'Sanity videoAsset create failed: ' + e.message})
  }

  // Return the wrapper for the client to insert into media[]
  return jsonResponse(res, 200, {
    ok: true,
    videoAsset: {
      _id: sanityDocId,
      assetId: asset.id,
      playbackId,
      status: asset.status,
    },
    _key: Math.random().toString(36).slice(2, 12),
  })
}
