import {defineConfig, loadEnv} from 'vite'
import {resolve} from 'path'
import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs'
import {createClient} from '@sanity/client'

/**
 * Vite plugin: generate /dist/sitemap.xml from seed-data at build time.
 * Maps internal section slugs to public URLs (music → madplus).
 */
function sitemapPlugin() {
  return {
    name: 'mad-studio-sitemap',
    apply: 'build',
    async closeBundle() {
      const SITE_URL = 'https://beingmad.co'
      const ID_TO_URL = {originals: 'originals', bubble: 'bubble', music: 'madplus', vision: 'vision'}
      const today = new Date().toISOString().split('T')[0]
      // Pull section + project lists from the seed file.
      const seed = await import('./sanity/scripts/seed-data.mjs')
      const sections = (seed.SECTIONS || []).map((s) => s.slug)
      const projects = seed.ORIGINALS_PROJECTS || []
      const urls = [
        {loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly'},
        ...sections.map((slug) => ({
          loc: `${SITE_URL}/${ID_TO_URL[slug] || slug}`,
          priority: '0.9',
          changefreq: 'weekly',
        })),
        ...projects.map((p) => ({
          // Every seeded project sits under the "originals" section today.
          loc: `${SITE_URL}/${ID_TO_URL[p.sectionSlug || 'originals'] || 'originals'}/${p.slug}`,
          priority: '0.7',
          changefreq: 'monthly',
        })),
      ]
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`
      const outDir = resolve(__dirname, 'dist')
      mkdirSync(outDir, {recursive: true})
      writeFileSync(resolve(outDir, 'sitemap.xml'), xml, 'utf8')
      console.log(`✓ Generated sitemap.xml (${urls.length} URLs)`)
    },
  }
}

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
      const SITE = 'https://beingmad.co'
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
            title, caption, year
          }
        }`)
      } catch (e) {
        console.warn('  perUrlHtml: Sanity fetch failed, skipping:', e.message)
        return
      }

      const tagline = 'Creativity is madness with a deadline.'
      const writeRoute = (urlPath, {title, description, ogImage, jsonLd}) => {
        let html = baseHtml
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        const setMeta = (prop, value) => {
          const re = new RegExp(`(<meta\\s+property="${prop}"\\s+content=")[^"]*"`, 'g')
          if (re.test(html)) html = html.replace(re, `$1${value}"`)
          else html = html.replace('</head>', `  <meta property="${prop}" content="${value}">\n</head>`)
        }
        const setNameMeta = (name, value) => {
          const re = new RegExp(`(<meta\\s+name="${name}"\\s+content=")[^"]*"`, 'g')
          if (re.test(html)) html = html.replace(re, `$1${value}"`)
        }
        const canonicalRe = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/
        if (canonicalRe.test(html)) {
          html = html.replace(canonicalRe, `<link rel="canonical" href="${SITE}${urlPath}">`)
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
          const block = `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`
          html = html.replace('</head>', block + '</head>')
        }

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
        ogImage: '/og-cover.jpg',
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
      console.log(`✓ Generated per-URL HTML files (${count} routes)`)
    },
  }
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [sitemapPlugin(), perUrlHtmlPlugin()],
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
