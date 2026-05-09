/**
 * Shared helpers for /api/admin/* serverless functions.
 *
 * Auth model: single shared password (ADMIN_PASSWORD env var on Vercel).
 * Login → httpOnly cookie containing a signed token. Each subsequent
 * write API call validates the cookie before mutating Sanity.
 */
import {createClient} from '@sanity/client'
import crypto from 'node:crypto'

const SECRET = process.env.ADMIN_SESSION_SECRET || 'CHANGE_ME_DEFAULT_DEV_SECRET'
const COOKIE_NAME = 'mad_admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/* ─── Password check ────────────────────────────────────────── */
export function isPasswordCorrect(input) {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected) return false
  if (typeof input !== 'string' || input.length === 0) return false
  // Constant-time compare to avoid timing leaks
  if (input.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected))
}

/* ─── Token sign/verify (HMAC-SHA256) ───────────────────────── */
export function signToken(payload = {}) {
  const body = {...payload, iat: Date.now()}
  const data = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (Date.now() - (payload.iat || 0) > COOKIE_MAX_AGE * 1000) return null
    return payload
  } catch {
    return null
  }
}

/* ─── Cookie helpers ────────────────────────────────────────── */
export function setSessionCookie(res, token) {
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
  res.setHeader('Set-Cookie', cookie)
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  )
}

export function readSessionCookie(req) {
  const raw = req.headers.cookie || ''
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

export function requireAuth(req, res) {
  const token = readSessionCookie(req)
  const session = token ? verifyToken(token) : null
  if (!session) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({error: 'Unauthorized'}))
    return null
  }
  return session
}

/* ─── Sanity write client (server-side only) ───────────────── */
export function sanityClient() {
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })
}

/* ─── JSON body parsing helper ─────────────────────────────── */
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

export function jsonResponse(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
