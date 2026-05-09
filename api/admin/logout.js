import {clearSessionCookie, jsonResponse} from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonResponse(res, 405, {error: 'Method not allowed'})
  clearSessionCookie(res)
  return jsonResponse(res, 200, {ok: true})
}
