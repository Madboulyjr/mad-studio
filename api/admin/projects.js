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

const ALLOWED_TOP = ['title', 'year', 'caption', 'tags', 'published', 'coverImage', 'media', 'order']
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

/* Sanity-shape validators — clients can pass simplified shapes which we
   normalise so we always write valid Sanity image / media items. */
function normaliseImage(img) {
  if (!img || typeof img !== 'object') return null
  // Accept either {assetId} OR {asset:{_ref}} OR {asset:{_id}}
  const assetId = img.assetId || img.asset?._ref || img.asset?._id
  if (!assetId) return null
  const out = {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
  }
  if (img.hotspot && typeof img.hotspot === 'object') {
    out.hotspot = {
      _type: 'sanity.imageHotspot',
      x: clamp01(img.hotspot.x),
      y: clamp01(img.hotspot.y),
      height: clamp01(img.hotspot.height ?? 1),
      width: clamp01(img.hotspot.width ?? 1),
    }
  }
  if (img.crop && typeof img.crop === 'object') {
    out.crop = {
      _type: 'sanity.imageCrop',
      top: clamp01(img.crop.top ?? 0),
      bottom: clamp01(img.crop.bottom ?? 0),
      left: clamp01(img.crop.left ?? 0),
      right: clamp01(img.crop.right ?? 0),
    }
  }
  return out
}
function normaliseMediaItem(item) {
  if (!item || typeof item !== 'object') return null
  // Image item
  if (item._type === 'image' || item.assetId || item.asset) {
    const img = normaliseImage(item)
    if (!img) return null
    if (item._key) img._key = item._key
    if (item.alt) img.alt = String(item.alt).slice(0, 200)
    if (item.caption) img.caption = String(item.caption).slice(0, 300)
    return img
  }
  // Video item — keep existing video reference plus the denormalised
  // playbackId + assetId baked onto the item. The frontend GROQ reads
  // those inline values because Sanity flags mux.videoAsset wrapper
  // docs as `reason: permission` for anonymous reads, so traversing
  // `video.asset->playbackId` returns null on the public site.
  if (item._type === 'videoItem') {
    const out = {
      _type: 'videoItem',
      _key: item._key || cryptoRandom(),
      video: item.video || null,
      caption: item.caption ? String(item.caption).slice(0, 300) : '',
      // Default is OFF — only autoplay (muted, looping) when the
      // editor has explicitly turned the toggle on. Anything other
      // than literal `true` is treated as off.
      autoplay: item.autoplay === true,
    }
    if (item.playbackId) out.playbackId = String(item.playbackId).slice(0, 64)
    if (item.assetId) out.assetId = String(item.assetId).slice(0, 64)
    return out
  }
  return null
}
function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}
function cryptoRandom() {
  return Math.random().toString(36).slice(2, 12)
}

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
          caseStudy,
          coverImage{
            ...,
            "assetId": asset._ref,
            "url": asset->url,
            "metadata": asset->metadata{dimensions}
          },
          media[]{
            ...,
            _type, _key,
            "assetId": asset._ref,
            "url": asset->url,
            "playbackId": video.asset->playbackId
          }
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

  // POST /api/admin/projects (no id) — CREATE new project
  // POST /api/admin/projects?action=reorder — bulk reorder ids in section
  if (req.method === 'POST') {
    if (!requireAuth(req, res)) return
    const url = new URL(req.url, 'http://x')
    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')

    let body
    try {
      body = await readJsonBody(req)
    } catch {
      return jsonResponse(res, 400, {error: 'Invalid JSON'})
    }

    // Bulk reorder
    if (action === 'reorder') {
      const ids = Array.isArray(body.ids) ? body.ids : null
      if (!ids || !ids.length) return jsonResponse(res, 400, {error: 'Missing ids[]'})
      const client = sanityClient()
      try {
        const tx = client.transaction()
        ids.forEach((projId, i) => {
          tx.patch(projId, {set: {order: i + 1}})
        })
        await tx.commit()
        return jsonResponse(res, 200, {ok: true, count: ids.length})
      } catch (e) {
        return jsonResponse(res, 500, {error: e.message || 'Reorder failed'})
      }
    }

    // Update existing (alias for PATCH; some callers use POST)
    if (id) {
      return updateProject(req, res, id, body)
    }

    // Create new
    const sectionSlug = String(body.sectionSlug || '').trim()
    const title = String(body.title || 'Untitled').trim().slice(0, 120)
    const slug = String(body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 60)
    if (!sectionSlug || !slug) {
      return jsonResponse(res, 400, {error: 'sectionSlug and slug (or title) required'})
    }
    const client = sanityClient()
    try {
      // Look up section _id
      const section = await client.fetch(
        `*[_type == "section" && slug.current == $slug][0]{_id}`,
        {slug: sectionSlug},
      )
      if (!section) return jsonResponse(res, 404, {error: `Section "${sectionSlug}" not found`})
      // Find highest order in this section to append at end
      const orderRows = await client.fetch(
        `*[_type == "project" && section._ref == $sid] | order(order desc)[0..0]{order}`,
        {sid: section._id},
      )
      section.maxOrder = (orderRows[0]?.order) || 0
      // Check slug not taken
      const existing = await client.fetch(
        `*[_type == "project" && slug.current == $slug][0]{_id}`,
        {slug},
      )
      if (existing) return jsonResponse(res, 409, {error: `A project with slug "${slug}" already exists`})
      // Create
      const doc = {
        _type: 'project',
        _id: `project-${slug}`,
        title,
        slug: {_type: 'slug', current: slug},
        section: {_type: 'reference', _ref: section._id},
        order: (section.maxOrder || 0) + 1,
        published: false, // start as draft so user can review before going live
      }
      await client.create(doc)
      return jsonResponse(res, 200, {ok: true, project: doc})
    } catch (e) {
      return jsonResponse(res, 500, {error: e.message || 'Create failed'})
    }
  }

  if (req.method === 'PATCH') {
    if (!requireAuth(req, res)) return
    const id = req.url && new URL(req.url, 'http://x').searchParams.get('id')
    if (!id) return jsonResponse(res, 400, {error: 'Missing ?id'})
    let body
    try {
      body = await readJsonBody(req)
    } catch {
      return jsonResponse(res, 400, {error: 'Invalid JSON'})
    }
    return updateProject(req, res, id, body)
  }

  if (req.method === 'DELETE') {
    if (!requireAuth(req, res)) return
    const id = req.url && new URL(req.url, 'http://x').searchParams.get('id')
    if (!id) return jsonResponse(res, 400, {error: 'Missing ?id'})
    const client = sanityClient()
    try {
      await client.delete(id)
      return jsonResponse(res, 200, {ok: true, deleted: id})
    } catch (e) {
      return jsonResponse(res, 500, {error: e.message || 'Delete failed'})
    }
  }

  return jsonResponse(res, 405, {error: 'Method not allowed'})
}

/* Shared update helper used by both PATCH /projects?id= and POST /projects?id= */
async function updateProject(req, res, id, body) {
  const top = pick(body, ALLOWED_TOP)
  const cs = pick(body.caseStudy || {}, ALLOWED_CS)
  const set = {...top}
  if (Object.keys(cs).length) set.caseStudy = cs

  // Normalise any image / media shapes the client sent
  if ('coverImage' in set) {
    const img = normaliseImage(set.coverImage)
    if (img) set.coverImage = img
    else delete set.coverImage
  }
  if ('media' in set) {
    if (Array.isArray(set.media)) {
      set.media = set.media.map(normaliseMediaItem).filter(Boolean)
    } else {
      delete set.media
    }
  }

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
