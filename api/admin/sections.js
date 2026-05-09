/**
 * GET   /api/admin/sections          → list all 4 sections
 * GET   /api/admin/sections?id=X     → fetch one section
 * PATCH /api/admin/sections?id=X     → update editable section fields
 */
import {requireAuth, sanityClient, readJsonBody, jsonResponse} from './_lib.js'

const ALLOWED = [
  'title',
  'subtitle',
  'description',
  'cardLabel',
  'kicker',
  'manifesto',
  'lead',
  'agencies',
  'worksLabel',
  'worksTitle',
  'musicEmbed',
  'musicPlatforms',
  'instagramMusic',
  'featuredRelease',
  'releases',
]

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj && k in obj) out[k] = obj[k]
  return out
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!requireAuth(req, res)) return
    const client = sanityClient()
    const id = (req.url && new URL(req.url, 'http://x').searchParams.get('id')) || null
    if (id) {
      const doc = await client.fetch(`*[_id == $id][0]`, {id})
      return jsonResponse(res, 200, {section: doc})
    }
    const list = await client.fetch(
      `*[_type == "section"] | order(order asc){
        _id, "slug": slug.current, order, title, subtitle, description, cardLabel,
        kicker, "manifestoLen": length(manifesto), "leadLen": length(lead),
        agencies, worksLabel, worksTitle
      }`,
    )
    return jsonResponse(res, 200, {sections: list})
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    if (!requireAuth(req, res)) return
    const id = req.url && new URL(req.url, 'http://x').searchParams.get('id')
    if (!id) return jsonResponse(res, 400, {error: 'Missing ?id'})
    let body
    try {
      body = await readJsonBody(req)
    } catch {
      return jsonResponse(res, 400, {error: 'Invalid JSON'})
    }
    const set = pick(body, ALLOWED)
    if (!Object.keys(set).length) return jsonResponse(res, 400, {error: 'No allowed fields'})

    const client = sanityClient()
    try {
      await client.patch(id).set(set).commit()
      const doc = await client.fetch(`*[_id == $id][0]`, {id})
      return jsonResponse(res, 200, {ok: true, section: doc})
    } catch (e) {
      return jsonResponse(res, 500, {error: e.message || 'Patch failed'})
    }
  }

  return jsonResponse(res, 405, {error: 'Method not allowed'})
}
