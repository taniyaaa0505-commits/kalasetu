import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The APK wrapper.
 *
 * The problem statement asks for a mobile APPLICATION, and "it's a website you
 * can add to your home screen" is an answer nobody in the room wants to hear.
 * This is the same build — the one in dist/ — inside an Android shell, so
 * there is one codebase and one thing to test, not two.
 *
 * Notes that matter for THIS app:
 *
 *  - androidScheme is https, not http. The cut-out model, the microphone and
 *    the camera are all secure-context features; on http:// the WebView treats
 *    the page as insecure and they simply stop existing.
 *
 *  - The web build already uses `base: './'` and a HashRouter, so it runs from
 *    a file path with no server and no rewrite rules. That was done for GitHub
 *    Pages and it is exactly what the APK needs too.
 *
 *  - No splash screen plugin. The first paint is the app shell, which is
 *    precached and tiny; a splash would only add a dependency and a delay.
 */
const config: CapacitorConfig = {
  appId: 'in.pehchaan.app',
  appName: 'Pehchaan',
  webDir: 'dist',
  android: {
    // Let her see the real error if something fails on her phone, rather than
    // a blank white WebView we cannot diagnose from a hall.
    webContentsDebuggingEnabled: true,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
