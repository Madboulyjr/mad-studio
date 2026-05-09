import {isPasswordCorrect, signToken, setSessionCookie, readJsonBody, jsonResponse} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, {error: 'Method not allowed'})
  }
  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return jsonResponse(res, 400, {error: 'Invalid JSON'})
  }
  const password = body && typeof body.password === 'string' ? body.password : ''
  if (!isPasswordCorrect(password)) {
    // Sleep a bit to slow down brute-force attempts
    await new Promise((r) => setTimeout(r, 700))
    return jsonResponse(res, 401, {error: 'Wrong password'})
  }
  const token = signToken({admin: true})
  setSessionCookie(res, token)
  return jsonResponse(res, 200, {ok: true})
}
