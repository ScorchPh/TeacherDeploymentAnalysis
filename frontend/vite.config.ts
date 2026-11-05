import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [
    vue(),
    vueDevTools(),
    {
      name: 'spa-route-fallbacks',
      closeBundle() {
        const distDir = fileURLToPath(new URL('./dist', import.meta.url))
        const indexHtml = path.join(distDir, 'index.html')
        if (!fs.existsSync(indexHtml)) return
        for (const route of ['dashboard', 'es', 'jhs', 'shs', 'login', 'staff']) {
          const dir = path.join(distDir, route)
          fs.mkdirSync(dir, { recursive: true })
          fs.copyFileSync(indexHtml, path.join(dir, 'index.html'))
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
