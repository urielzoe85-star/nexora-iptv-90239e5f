// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
// PWA temporairement désactivée (test wrapper Capacitor Android).
// Voir src/pwa/config.ts (PWA_ENABLED). Pour réactiver : décommenter
// l'import et le bloc VitePWA ci-dessous.
// import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      // VitePWA({
      //   strategies: "generateSW",
      //   registerType: "autoUpdate",
      //   injectRegister: null,
      //   filename: "sw.js",
      //   manifest: false,
      //   devOptions: { enabled: false },
      //   workbox: {
      //     navigateFallback: "/",
      //     navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/, /^\/sitemap\.xml/, /^\/robots\.txt/],
      //     globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
      //     maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      //     cleanupOutdatedCaches: true,
      //     clientsClaim: true,
      //     skipWaiting: false,
      //   },
      // }),
    ],
  },
});
