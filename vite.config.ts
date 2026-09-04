import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',            // relative paths, so the build runs from any sub-path
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png',
                      'icons/favicon-32.png', 'icons/favicon-48.png'],

      manifest: {
        name: 'KalaSetu — कलासेतु',
        short_name: 'KalaSetu',
        description: 'Photograph it, speak about it, sell it. For artisans.',
        lang: 'hi',
        start_url: './',
        scope: './',
        display: 'standalone',            // no address bar; it reads as an app
        orientation: 'portrait',
        background_color: '#FBFAF7',
        theme_color: '#2B3A8F',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // The app shell — small, and precached so it opens with no signal.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],   // jpg = the tour's demo photos

        // Everything heavy is fetched on demand and then kept forever, rather
        // than making the install a punishing download on a metered
        // connection. Firestore in particular is 647 KB that a device with no
        // cloud configured would never load at all.
        globIgnores: ['**/*.wasm', '**/firebase-*.js', '**/transformers-*.js'],

        runtimeCaching: [
          {
            urlPattern: /\/(firebase|transformers)-[A-Za-z0-9_-]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-libs',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnx-runtime',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The cut-out model, pulled from Hugging Face on first use. Once
            // this is cached, background removal works in aeroplane mode.
            urlPattern: /^https:\/\/(huggingface\.co|cdn-lfs[^/]*\.hf\.co)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rmbg-model',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Never let a stale shell linger after a deploy.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },

      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Give the two heavy libraries stable names so the service worker can
        // keep them OUT of the install and fetch them only if they are used.
        manualChunks(id) {
          if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'firebase'
          if (id.includes('@huggingface/transformers')) return 'transformers'
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
  },
})
