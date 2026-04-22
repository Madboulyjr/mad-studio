import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const sanity = createClient({
  projectId: __SANITY_PROJECT_ID__,
  dataset: __SANITY_DATASET__,
  apiVersion: __SANITY_API_VERSION__,
  useCdn: true, // enables the read-only fast CDN for production
})

const builder = imageUrlBuilder(sanity)

/** Build a URL for a Sanity image reference. */
export function urlFor(source) {
  return builder.image(source)
}

const QUERY = `{
  "siteSettings": *[_type == "siteSettings"][0]{
    tagline, websiteUrl, websiteUrlLabel, contactEmail, socials
  },
  "sections": *[_type == "section"] | order(order asc){
    "slug": slug.current,
    order, title, subtitle, description, cardLabel,
    landingBg, landingAccent, landingHeadline, landingSubtitle, counterLabel,
    kicker, manifesto, lead, agencies, worksLabel, worksTitle,
    illustrationSvg
  },
  "projects": *[_type == "project" && published == true] | order(section->order asc, order asc){
    _id,
    "slug": slug.current,
    "sectionSlug": section->slug.current,
    title, year, caption, tags,
    coverImage,
    media[]{
      ...,
      _type,
      _key,
      asset->{_id, url, metadata{dimensions}},
      "playbackId": video.asset->playbackId,
      "assetId": video.asset->assetId
    }
  }
}`

export async function fetchContent() {
  return sanity.fetch(QUERY)
}
