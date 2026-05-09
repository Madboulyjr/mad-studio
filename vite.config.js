import {defineConfig, loadEnv} from 'vite'
import {resolve} from 'path'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
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
