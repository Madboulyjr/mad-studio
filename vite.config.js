import {normalizeContent, externalProjectUrl, escapeHtml} from './src/content-utils.js'
import {defineConfig, loadEnv} from 'vite'
import {resolve} from 'path'
import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs'
import {createClient} from '@sanity/client'

/**
 * Vite plugin: clone /dist/index.html to per-URL static HTML files with
 * route-specific <title> + Open Graph meta. Crawlers + social link
 * previews now see correct per-URL metadata (instead of every URL
 * sharing the landing page's meta).
 *
 * Generated:
 *   /dist/originals/index.html         → /originals
 *   /dist/originals/biolab/index.html  → /originals/biolab
 *   etc.
 *
 * Each file contains the same SPA shell + script, but with patched meta
 * tags. When the URL is requested, Vercel serves the matching HTML
 * (clean URL routing handles this automatically since cleanUrls=true).
 * The SPA still hydrates and routes correctly on the client.
 */
function perUrlHtmlPlugin() {
  return {
    name: 'mad-studio-per-url-html',
    apply: 'build',
    async closeBundle() {
      const SITE = 'https://www.beingmad.co'
      const ID_TO_URL = {originals: 'originals', bubble: 'bubble', music: 'madplus', vision: 'vision'}
      const distDir = resolve(__dirname, 'dist')
      const indexPath = resolve(distDir, 'index.html')
      if (!existsSync(indexPath)) {
        console.warn('  perUrlHtml: dist/index.html missing — skipping')
        return
      }
      const baseHtml = readFileSync(indexPath, 'utf8')

      const client = createClient({
        projectId: process.env.SANITY_PROJECT_ID || 'f4pxr4lu',
        dataset: process.env.SANITY_DATASET || 'production',
        apiVersion: '2024-01-01',
        useCdn: true,
      })
      let data
      try {
        data = await client.fetch(`{
          "sections": *[_type == "section"]{
            _id, "slug": slug.current, title, subtitle, description
          },
          "projects": *[_type == "project" && published == true]{
            "slug": slug.current,
            "sectionSlug": section->slug.current,
            "sectionTitle": section->title,
            title, caption, year, tags, caseStudy,
            media[]{..., "playbackId": coalesce(playbackId, video.asset->playbackId), "fileUrl": file.asset->url}
          }
        }`)
      } catch (e) {
        throw new Error(`Cannot build current project routes: ${e.message}`)
      }

      data = normalizeContent(data)
      const routePaths = []
      const tagline = 'Creativity is madness with a deadline.'
      const writeRoute = (urlPath, {title, description, ogImage, jsonLd, noindex = false}) => {
        if (!existsSync(resolve(distDir, ogImage.split('?')[0].replace(/^\//, '')))) ogImage = '/og-cover.jpg?v=4'
        let html = baseHtml
        html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
        const setMeta = (prop, value) => {
          const re = new RegExp(`(<meta\\s+property="${prop}"\\s+content=")[^"]*"`, 'g')
          if (re.test(html)) html = html.replace(re, (_, prefix) => `${prefix}${escapeHtml(value)}"`)
          else html = html.replace('</head>', `  <meta property="${prop}" content="${escapeHtml(value)}">\n</head>`)
        }
        const setNameMeta = (name, value) => {
          const re = new RegExp(`(<meta\\s+name="${name}"\\s+content=")[^"]*"`, 'g')
          if (re.test(html)) html = html.replace(re, (_, prefix) => `${prefix}${escapeHtml(value)}"`)
        }
        const canonicalRe = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/
        if (canonicalRe.test(html)) {
          html = html.replace(canonicalRe, `<link rel="canonical" href="${escapeHtml(SITE + urlPath)}">`)
        }
        setMeta('og:title', title)
        setMeta('og:description', description)
        setMeta('og:url', `${SITE}${urlPath}`)
        setMeta('og:image', `${SITE}${ogImage}`)
        setNameMeta('description', description)
        setNameMeta('twitter:title', title)
        setNameMeta('twitter:description', description)
        setNameMeta('twitter:image', `${SITE}${ogImage}`)

        // JSON-LD structured data — injected as a <script> before </head>.
        if (jsonLd) {
          const block = `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n`
          html = html.replace('</head>', block + '</head>')
        }

        if (noindex) html = html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
        else routePaths.push(urlPath)
        const filePath = urlPath === '/'
          ? indexPath // landing keeps the original index.html
          : resolve(distDir, urlPath.replace(/^\//, ''), 'index.html')
        if (urlPath !== '/') {
          mkdirSync(resolve(filePath, '..'), {recursive: true})
        }
        writeFileSync(filePath, html, 'utf8')
      }

      let count = 0
      // Landing — brand Organization
      writeRoute('/', {
        title: `MAD Studio — ${tagline}`,
        description: tagline,
        ogImage: '/og-cover.jpg?v=4',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'MAD Studio',
          url: SITE,
          slogan: tagline,
          sameAs: [
            'https://www.instagram.com/madbovlly',
            'https://open.spotify.com/artist/6wcaWzTRzPz0uGwF0Z54Jy',
          ],
        },
      })
      // Sections
      for (const s of data.sections) {
        const sectionUrl = ID_TO_URL[s.slug] || s.slug
        writeRoute(`/${sectionUrl}`, {
          title: `${s.title} — MAD Studio`,
          description: s.description || tagline,
          ogImage: `/og/${sectionUrl}.jpg`,
        })
        count++
      }
      // Projects
      for (const p of data.projects) {
        const sectionUrl = ID_TO_URL[p.sectionSlug] || p.sectionSlug
        if (!sectionUrl || !p.slug) continue
        writeRoute(`/${sectionUrl}/${p.slug}`, {
          noindex: !!externalProjectUrl(p),
          title: `${p.title}${p.year ? ` · ${p.year}` : ''} — ${p.sectionTitle} · MAD Studio`,
          description: (p.caption || '').replace(/\s+—\s+/g, ' ').slice(0, 160) || tagline,
          ogImage: `/og/${sectionUrl}-${p.slug}.jpg`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: p.title,
            ...(p.year ? {dateCreated: String(p.year)} : {}),
            ...(p.caption ? {description: (p.caption || '').replace(/\s+—\s+/g, ' ').slice(0, 300)} : {}),
            creator: {'@type': 'Organization', name: 'MAD Studio', url: SITE},
            url: `${SITE}/${sectionUrl}/${p.slug}`,
            image: `${SITE}/og/${sectionUrl}-${p.slug}.jpg`,
            isPartOf: {'@type': 'CollectionPage', name: p.sectionTitle, url: `${SITE}/${sectionUrl}`},
          },
        })
        count++
      }
      for (const [path, title, description] of [
        ['/manifesto','Manifesto · MAD Studio','The philosophy behind MAD Studio.'],
        ['/cv','Résumé — Ali Shehata · Senior Art Director','Experience and selected work by Ali Shehata.'],
      ]) writeRoute(path, {title, description, ogImage:'/og-cover.jpg?v=4'})
      writeRoute('/404', {title:'404 — Page not found · MAD Studio', description:'This page could not be found. Explore MAD Studio’s work.', ogImage:'/og-cover.jpg?v=4', noindex:true})
      writeFileSync(resolve(distDir, '404.html'), readFileSync(resolve(distDir, '404/index.html')))
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(routePaths)].map(path => `  <url><loc>${escapeHtml(SITE + path)}</loc></url>`).join('\n')}\n</urlset>\n`
      writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
      console.log(`✓ Generated sitemap.xml (${routePaths.length} current URLs)`)
      console.log(`✓ Generated per-URL HTML files (${count} routes)`)
    },
  }
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [perUrlHtmlPlugin()],
    root: 'src',
    publicDir: resolve(__dirname, 'public'),
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      target: 'esnext',
      // Split heavy vendor deps into their own chunks so the browser can
      // parallel-fetch them and cache them independently from app code.
      // @mux/mux-player is dynamic-imported in main.js → Rollup will
      // automatically code-split it; we still hint manualChunks so the
      // chunk file name is predictable.
      rollupOptions: {
        output: {
          manualChunks: {
            sanity: ['@sanity/client', '@sanity/image-url'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    esbuild: {
      supported: {'top-level-await': true},
    },
    optimizeDeps: {
      esbuildOptions: {target: 'esnext'},
    },
    define: {
      // expose safe env vars to the client
      __SANITY_PROJECT_ID__: JSON.stringify(env.SANITY_PROJECT_ID || 'f4pxr4lu'),
      __SANITY_DATASET__: JSON.stringify(env.SANITY_DATASET || 'production'),
      __SANITY_API_VERSION__: JSON.stringify(env.SANITY_API_VERSION || '2024-01-01'),
    },
    server: {
      port: 5173,
    },
  }
})
