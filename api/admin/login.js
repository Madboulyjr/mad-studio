import {
  isPasswordCorrect,
  signToken,
  setSessionCookie,
  readJsonBody,
  jsonResponse,
  getClientIp,
  checkLoginRate,
  recordLoginFailure,
  clearLoginAttempts,
} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, {error: 'Method not allowed'})
  }

  // Rate-limit failed attempts per client IP. 5 fails / 15 min → 429.
  const ip = getClientIp(req)
  const rate = checkLoginRate(ip)
  if (rate.blocked) {
    res.setHeader('Retry-After', String(rate.retryAfterSec))
    return jsonResponse(res, 429, {
      error: 'Too many login attempts. Try again later.',
      retryAfterSec: rate.retryAfterSec,
    })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return jsonResponse(res, 400, {error: 'Invalid JSON'})
  }
  const password = body && typeof body.password === 'string' ? body.password : ''
  if (!isPasswordCorrect(password)) {
    recordLoginFailure(ip)
    // Sleep a bit to slow down brute-force attempts
    await new Promise((r) => setTimeout(r, 700))
    return jsonResponse(res, 401, {error: 'Wrong password'})
  }
  clearLoginAttempts(ip)
  const token = signToken({admin: true})
  setSessionCookie(res, token)
  return jsonResponse(res, 200, {ok: true})
}
