import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Vite dev server is the front door (5174) and proxies /api to the Express API.
// scripts/dev.mjs starts both; API_PORT keeps the proxy and the API in sync.
const apiPort = process.env.API_PORT ?? '8788'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
})
