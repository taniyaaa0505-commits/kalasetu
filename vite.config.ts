import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',            // relative paths, so the build runs from any sub-path
  plugins: [react(), tailwindcss()],
  server: {
    host: true,                            // reachable from your phone on the same wifi
    // The camera and microphone need HTTPS. Plain http://192.168.x.x will not work.
    // So we tunnel: `cloudflared tunnel --url http://localhost:5173` gives a free
    // https://<random>.trycloudflare.com URL. Vite blocks unknown hosts by default,
    // which is why this line exists.
    allowedHosts: ['.trycloudflare.com'],
  },
})
