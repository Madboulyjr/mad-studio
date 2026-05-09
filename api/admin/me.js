import {readSessionCookie, verifyToken, jsonResponse} from './_lib.js'

export default async function handler(req, res) {
  const token = readSessionCookie(req)
  const session = token ? verifyToken(token) : null
  return jsonResponse(res, 200, {authed: !!session})
}
