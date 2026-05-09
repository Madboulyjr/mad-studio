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

  if (!process.env.SANITY_WRITE_TOKEN) {
    return jsonResponse(res, 500, {
      error:
        'SANITY_WRITE_TOKEN is not set on the server. Add it in Vercel → Settings → Environment Variables (use a token with Editor or higher permissions).',
    })
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
    // Sanity client errors often have helpful nested details
    // (statusCode, response.body, response.statusMessage). Surface
    // whatever we can find so the front-end can display the real
    // reason instead of the useless "Upload failed" string.
    const detail =
      (e && e.response && (e.response.body && (e.response.body.error || e.response.body.message)
        || e.response.statusMessage)) ||
      (e && e.message) ||
      'Upload failed'
    const code = (e && (e.statusCode || (e.response && e.response.statusCode))) || 500
    console.error('[upload-image] Sanity error:', code, detail, e)
    // 401/403 from Sanity → friendly message about the token
    if (code === 401 || code === 403) {
      return jsonResponse(res, 500, {
        error: `Sanity rejected the upload (HTTP ${code}). Your SANITY_WRITE_TOKEN doesn't have write/asset permission. Generate a new "Editor" token at https://sanity.io/manage and update it on Vercel.`,
      })
    }
    return jsonResponse(res, 500, {error: `Sanity error (${code}): ${detail}`})
  }
}
