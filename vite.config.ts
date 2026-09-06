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
        name: 'Pehchaan — पहचान',
        short_name: 'Pehchaan',
        description: 'Photograph it, speak about it, sell it. For artisans.',
        lang: 'hi',
        start_url: './',
        scope: './',
        display: 'standalone',            // no address bar; it reads as an app
        orientation: 'portrait',
        background_color: '#FBF4E7',
        theme_color: '#101A2E',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // The app shell — small, and precached so it opens with no signal.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],   // jpg = the tour's demo photos

        /*
         * Only the 23 MB ONNX runtime is left out.
         *
         * Firebase and transformers used to be excluded too, on the reasoning
         * that they are heavy and should be fetched on demand and kept by the
         * runtime cache. That reasoning was wrong, and it broke the one claim
         * this app is built on.
         *
         * A runtime cache can only keep what passes THROUGH the service
         * worker, and both chunks are dynamically imported early — before the
         * worker has taken control of the page. So they were never cached at
         * all, and with no signal every import of them failed outright:
         * `Failed to fetch dynamically imported module`. Reported from a real
         * phone with the network off — she photographs her pot and never
         * reaches the cleaning screen, because creating the product needs
         * Firestore and Firestore needs a chunk that is not there.
         *
         * About 1.2 MB more on install, once, against an app whose entire
         * pitch is that it works with no signal. The wasm stays out because 23
         * MB genuinely is punishing on a metered connection, and
         * transformers.js keeps its own copy in Cache Storage after one run.
         */
        globIgnores: ['**/*.wasm'],

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
          // NOTHING HERE FOR THE CUT-OUT MODEL OR THE ONNX RUNTIME, on purpose.
          //
          // There used to be two rules: one for *.wasm and one for
          // huggingface.co. They never worked — the weights actually come from
          // us.aws.cdn.hf.co and the runtime from cdn.jsdelivr.net, and neither
          // matched. Verified in a browser: after one run, a reload downloads
          // 0 bytes of either, because transformers.js already caches both in
          // its own Cache Storage bucket ("transformers-cache").
          //
          // So making those patterns match would not have fixed anything; it
          // would have put a SECOND copy of the same 49 MB on her phone. If you
          // are here because offline cut-outs failed, check that bucket before
          // adding a rule back.
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
