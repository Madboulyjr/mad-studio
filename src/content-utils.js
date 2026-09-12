import {ORIGINALS_COLLABORATIONS, SECTION_COPY, MANIFESTO_COPY, PROJECT_STORIES, BUBBLE_COPY, projectRole} from './editorial-copy.js'
// Shared by the browser and static-page generation, so visible work and URLs agree.
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}
export function hasProjectMedia(project) {
  return (project.media || []).some(item =>
    !!((item._type === 'image' && item.asset) ||
       (item._type === 'videoItem' && item.playbackId) ||
       (item._type === 'videoFile' && item.fileUrl) ||
       (item._type === 'videoEmbed' && item.url)))
}
export function externalProjectUrl(project) {
  if (hasProjectMedia(project)) return ''
  try {
    const url = new URL(project.caseStudy?.externalUrl)
    return url.protocol === 'https:' ? url.href : ''
  } catch { return '' }
}
export function normalizeContent(content) {
  if (!Array.isArray(content?.sections) || !content.sections.length || !Array.isArray(content.projects)) {
    throw new Error('Content is temporarily unavailable')
  }
  return {
    ...content,
    siteSettings: {...content.siteSettings, manifestoBody: MANIFESTO_COPY},
    sections: content.sections.map(section => ({
      ...section,
      ...SECTION_COPY[section.slug],
      ...(section.slug === 'originals' ? {
        agencies: [...new Map([...ORIGINALS_COLLABORATIONS, ...(section.agencies || [])]
          .map(name => [name.trim().toLowerCase(), name.trim()])).values()],
      } : {}),
    })),
    projects: content.projects
      .filter(project => hasProjectMedia(project) || externalProjectUrl(project))
      .map(project => {
        const story = PROJECT_STORIES[project.slug]
        if (project.sectionSlug === 'originals' && story) {
          return {...project, caption: story.caption, caseStudy: {
            ...project.caseStudy, ...story, role: projectRole(project),
          }}
        }
        return BUBBLE_COPY[project.slug] ? {...project, caption:BUBBLE_COPY[project.slug]} : project
      }),
  }
}
export function musicPlatform(url) {
  try {
    const host = new URL(url).hostname
    if (host === 'open.spotify.com') return 'Spotify'
    if (host === 'deezer.com' || host.endsWith('.deezer.com')) return 'Deezer'
    if (host === 'music.apple.com') return 'Apple Music'
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YouTube'
    if (host.endsWith('soundcloud.com')) return 'SoundCloud'
    if (host.endsWith('anghami.com')) return 'Anghami'
  } catch {}
  return 'streaming platform'
}
