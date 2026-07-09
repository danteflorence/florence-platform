import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

// The Vite dev server is the front door (port 5173) and proxies /api to the
// Express API server (port 8787). scripts/dev.mjs starts both together.
const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = existsSync(resolve(here, '../../packages')) ? resolve(here, '../..') : resolve(here, '..')
const designSystemSrc = resolve(workspaceRoot, 'packages/design-system/src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@florence/design-system/preview', replacement: resolve(designSystemSrc, 'preview.tsx') },
      { find: '@florence/design-system/tokens.css', replacement: resolve(designSystemSrc, 'tokens.css') },
      { find: '@florence/design-system', replacement: resolve(designSystemSrc, 'index.tsx') },
      { find: /^react\/jsx-runtime$/, replacement: resolve(here, 'node_modules/react/jsx-runtime.js') },
      { find: /^react$/, replacement: resolve(here, 'node_modules/react/index.js') },
      { find: '@shared', replacement: fileURLToPath(new URL('./shared', import.meta.url)) },
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
