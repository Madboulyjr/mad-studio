/**
 * GET  /api/admin/projects        → list all projects (admin form view)
 * GET  /api/admin/projects?id=X   → fetch one project
 * PATCH /api/admin/projects?id=X  → update text fields on a project
 *
 * Allowed update fields (whitelist — anything else is silently dropped):
 *   title, year, caption, tags[], published,
 *   caseStudy.role, caseStudy.client, caseStudy.agency,
 *   caseStudy.problem, caseStudy.constraints[], caseStudy.outcome[],
 *   caseStudy.awards[], caseStudy.externalUrl
 */
import {requireAuth, sanityClient, readJsonBody, jsonResponse} from './_lib.js'

const ALLOWED_TOP = ['title', 'year', 'caption', 'tags', 'published']
const ALLOWED_CS = [
  'role',
  'client',
  'agency',
  'problem',
  'constraints',
  'outcome',
  'awards',
  'externalUrl',
]

function pick(obj, keys) {
  const out = {}
  if (!obj || typeof obj !== 'object') return out
  for (const k of keys) if (k in obj) out[k] = obj[k]
  return out
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Public-ish read (still gated by auth so we don't leak unpublished)
    if (!requireAuth(req, res)) return
    const client = sanityClient()
    const id = (req.url && new URL(req.url, 'http://x').searchParams.get('id')) || null
    if (id) {
      const doc = await client.fetch(
        `*[_id == $id][0]{
          _id, title, "slug": slug.current,
          "sectionSlug": section->slug.current,
          year, caption, tags, published,
          caseStudy
        }`,
        {id},
      )
      return jsonResponse(res, 200, {project: doc})
    }
    const list = await client.fetch(
      `*[_type == "project"] | order(section->order asc, order asc){
        _id, title, "slug": slug.current,
        "sectionSlug": section->slug.current,
        year, caption, tags, published
      }`,
    )
    return jsonResponse(res, 200, {projects: list})
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
    const top = pick(body, ALLOWED_TOP)
    const cs = pick(body.caseStudy || {}, ALLOWED_CS)
    const set = {...top}
    if (Object.keys(cs).length) set.caseStudy = cs
    if (!Object.keys(set).length) return jsonResponse(res, 400, {error: 'No allowed fields in body'})

    const client = sanityClient()
    try {
      await client.patch(id).set(set).commit()
      const doc = await client.fetch(`*[_id == $id][0]`, {id})
      return jsonResponse(res, 200, {ok: true, project: doc})
    } catch (e) {
      return jsonResponse(res, 500, {error: e.message || 'Patch failed'})
    }
  }

  return jsonResponse(res, 405, {error: 'Method not allowed'})
}
