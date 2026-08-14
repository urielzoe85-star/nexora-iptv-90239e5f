// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
// PWA web active. Le manifest est servi statiquement depuis
// public/manifest.webmanifest (manifest: false ci-dessous), et
// l'enregistrement passe exclusivement par src/pwa/register.ts
// (injectRegister: null) qui refuse dev / iframe / preview / natif / ?sw=off.
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        manifest: false,
        devOptions: { enabled: false },
        // Le build TanStack Start émet le bundle navigateur dans dist/client :
        // sans cette précision le service worker atterrit dans dist/ (donc
        // introuvable sur /sw.js) et précache aussi les artefacts serveur.
        outDir: "dist/client",
        workbox: {
          navigateFallback: "/",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/~oauth/,
            /^\/sitemap\.xml/,
            /^\/robots\.txt/,
            /^\/rss\.xml/,
          ],
          // Précache volontairement minimal (CSS, HTML, polices, icônes) :
          // précacher tous les chunks JS représentait ~19 Mo téléchargés dès la
          // première visite. Les bundles hachés sont mis en cache à l'usage via
          // runtimeCaching ci-dessous (CacheFirst, immuables par hash).
          globPatterns: ["**/*.{css,html,ico,woff2}", "pwa-*.png", "favicon*.png", "apple-touch-icon.png"],
          globIgnores: ["**/gallery-seed/**", "**/node_modules/**"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              // Les navigations HTML ne doivent jamais être servies
              // cache-first : sinon une page périmée survit à un déploiement.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "nexora-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Bundles hachés : immuables, donc CacheFirst sans revalidation.
              urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
                sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: {
                cacheName: "nexora-assets",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Images servies au fil de la navigation, pas au premier chargement.
              urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
                sameOrigin && request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "nexora-images",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
