/**
 * POST /api/admin/video/init
 *
 * Step 1 of Mux Direct Upload flow:
 *   Server creates a Mux upload URL, returns it to the client.
 *   Client then PUTs the video file directly to that URL (bypassing
 *   our serverless function — Vercel can't handle large file streams).
 *
 * Required env vars:
 *   MUX_TOKEN_ID
 *   MUX_TOKEN_SECRET
 *
 * Returns: { ok: true, uploadUrl, uploadId }
 */
import {requireAuth, jsonResponse} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, {error: 'Method not allowed'})
  if (!requireAuth(req, res)) return

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET
  if (!tokenId || !tokenSecret) {
    return jsonResponse(res, 500, {error: 'Mux credentials not configured (set MUX_TOKEN_ID + MUX_TOKEN_SECRET)'})
  }

  const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')

  try {
    const r = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          encoding_tier: 'baseline',
        },
        timeout: 3600, // upload URL valid for 1 hour
      }),
    })
    const json = await r.json()
    if (!r.ok) {
      return jsonResponse(res, r.status, {error: json?.error?.messages?.join('; ') || 'Mux upload init failed'})
    }
    return jsonResponse(res, 200, {
      ok: true,
      uploadUrl: json.data.url,
      uploadId: json.data.id,
    })
  } catch (e) {
    return jsonResponse(res, 500, {error: e.message || 'Mux init failed'})
  }
}
