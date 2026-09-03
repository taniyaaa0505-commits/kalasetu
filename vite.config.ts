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
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],

        // The ONNX runtime is 23 MB. Precaching it would make installing the
        // app a punishing download on a metered connection, so it is fetched
        // on demand and then kept forever.
        globIgnores: ['**/*.wasm'],

        runtimeCaching: [
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
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
  },
})
