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
