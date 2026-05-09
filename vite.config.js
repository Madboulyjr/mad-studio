import {defineConfig, loadEnv} from 'vite'
import {resolve} from 'path'
import {writeFileSync, mkdirSync} from 'node:fs'

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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [sitemapPlugin()],
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
