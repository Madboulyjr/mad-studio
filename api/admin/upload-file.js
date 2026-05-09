/**
 * POST /api/admin/upload-file
 * Body: { filename, contentType, base64, kind? }
 *
 * Generic file upload (audio for now — could host PDFs, etc. later).
 * Mirrors upload-image.js but uses Sanity's `file` asset type instead
 * of `image` so MP3/WAV files get the right MIME handling on the CDN.
 *
 * Allowed types (audio only for now):
 *   audio/mpeg, audio/mp4, audio/wav, audio/x-wav, audio/aac, audio/ogg,
 *   audio/webm, audio/flac
 *
 * Returns the same shape as upload-image:
 *   { ok: true, asset: { _id, url, mimeType, size } }
 */
import {requireAuth, sanityClient, readJsonBody, jsonResponse} from './_lib.js'

// 12 MB cap on decoded audio (covers ~5min of 192kbps MP3). Vercel's
// default function body limit is the bottleneck — keep tight.
const MAX_BYTES = 12 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
])

export const config = {
  api: {bodyParser: {sizeLimit: '16mb'}},
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, {error: 'Method not allowed'})
  if (!requireAuth(req, res)) return

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return jsonResponse(res, 400, {error: 'Invalid JSON'})
  }

  const filename = String(body.filename || 'audio').replace(/[^\w.\- ]/g, '_').slice(0, 100)
  const contentType = String(body.contentType || '')
  const base64 = String(body.base64 || '')

  if (!ALLOWED_TYPES.has(contentType)) {
    return jsonResponse(res, 400, {error: `Unsupported content type: ${contentType}`})
  }

  let buf
  try {
    const cleaned = base64.replace(/^data:[^,]*,/, '')
    buf = Buffer.from(cleaned, 'base64')
  } catch {
    return jsonResponse(res, 400, {error: 'Invalid base64'})
  }
  if (buf.length === 0) return jsonResponse(res, 400, {error: 'Empty file'})
  if (buf.length > MAX_BYTES) {
    return jsonResponse(res, 413, {error: `File too large: ${buf.length} bytes (max ${MAX_BYTES})`})
  }

  try {
    const client = sanityClient()
    const asset = await client.assets.upload('file', buf, {filename, contentType})
    return jsonResponse(res, 200, {
      ok: true,
      asset: {
        _id: asset._id,
        url: asset.url,
        mimeType: asset.mimeType,
        size: asset.size,
      },
    })
  } catch (e) {
    return jsonResponse(res, 500, {error: e.message || 'Upload failed'})
  }
}
