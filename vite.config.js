import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run build:extension` builds a Chrome extension (Manifest V3) that
// replaces the new tab page. It adds the manifest and uses relative paths.
const chromeExtension = () => ({
  name: 'habitflow-chrome-extension',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'manifest.json',
      source: readFileSync(new URL('./extension/manifest.json', import.meta.url), 'utf8'),
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const extension = mode === 'extension'
  return {
    base: extension ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      extension && chromeExtension(),
    ],
    build: extension ? { outDir: 'dist-extension' } : {},
  }
})
