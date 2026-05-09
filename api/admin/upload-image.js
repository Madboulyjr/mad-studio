/**
 * POST /api/admin/upload-image
 * Body: { filename, contentType, base64 }
 *
 * Decodes the base64 → uploads to Sanity assets API → returns the
 * asset doc (we mainly want the _id so the client can reference it
 * in coverImage / media[] PATCH calls).
 *
 * Why base64-in-JSON instead of multipart/form-data:
 *   - No new server-side deps (formidable / busboy / multer)
 *   - Vercel functions handle JSON natively
 *   - Client just reads file with FileReader → upload as JSON
 * Trade-off: ~33% payload overhead, fine for <5MB images.
 */
import {requireAuth, sanityClient, readJsonBody, jsonResponse} from './_lib.js'

// 8 MB cap on the decoded file (Vercel's serverless body limit is ~4.5MB
// at default config, base64 expands ~33% so practical cap is ~3.5MB. We
// allow up to 8MB at decode level — Vercel may reject larger requests
// with a 413 before we even see them). Keep tight for safety.
const MAX_BYTES = 8 * 1024 * 1024

// Allow common bitmap formats; reject anything else (cheap virus-fuzzing)
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

// Disable Vercel's default body parser limits — we parse manually
export const config = {
  api: {bodyParser: {sizeLimit: '10mb'}},
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

  const filename = String(body.filename || 'upload').replace(/[^\w.\- ]/g, '_').slice(0, 100)
  const contentType = String(body.contentType || '')
  const base64 = String(body.base64 || '')

  if (!ALLOWED_TYPES.has(contentType)) {
    return jsonResponse(res, 400, {error: `Unsupported content type: ${contentType}`})
  }

  let buf
  try {
    // Strip "data:image/...;base64," prefix if present
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
    const asset = await client.assets.upload('image', buf, {filename, contentType})
    return jsonResponse(res, 200, {
      ok: true,
      asset: {
        _id: asset._id,
        url: asset.url,
        mimeType: asset.mimeType,
        size: asset.size,
        metadata: asset.metadata,
      },
    })
  } catch (e) {
    return jsonResponse(res, 500, {error: e.message || 'Upload failed'})
  }
}
