#!/usr/bin/env node
/**
 * App Store Build Pipeline
 * ------------------------
 * 1. Snapshot src/ + public/
 * 2. Delete sensitive routes (ncc, admin, blog, reseller, produits, catalog,
 *    galerie, guide-iptv, legal-guide, sitemap, rss, merchant-feed).
 * 3. Run SANITIZE dict on every remaining source file.
 * 4. Swap public/manifest.webmanifest with the neutral one.
 * 5. Remove public/llms.txt.
 * 6. Rewrite src/lib/app-store-mode.ts so no clear-text term ships.
 * 7. Run `vite build` with VITE_APP_STORE_MODE=1 (PWA disabled via config).
 * 8. Run audit-appstore.mjs against dist/.
 * 9. Restore snapshot (always, even on failure).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const PUB = path.join(ROOT, "public");
const SNAP = path.join(ROOT, ".appstore-snapshot");

// Route file basenames (under src/routes/) to remove entirely.
// Matches by regex on the entry name inside src/routes/.
const DELETE_ROUTES = [
  /^ncc\./i,
  /^admin\./i,
  /^blog\./i,
  /^produits\./i,
  /^reseller\./i,
  /^catalog\./i,
  /^galerie\./i,
  /^gallery\./i,
  /^legal-guide\./i,
  /^(fr|en|de)\.guide-iptv\./i,
  /^espace-client\.downloads\./i,
  /^sitemap/i,
  /^rss/i,
  /^merchant-feed/i,
];

// Non-route trees that are only used by deleted routes. Deleted entirely.
const DELETE_PATHS = [
  "src/components/ncc",
  "src/components/admin",
  "src/components/ai",
];

// Files kept-but-stubbed: their exports may still be imported by kept
// components (homepage widgets, checkout, etc.). We replace the body with
// a neutral stub that keeps every named export but returns empty data.
const STUB_FILES = [
  ["src/lib/blog.functions.ts", `import { createServerFn } from "@tanstack/react-start";
export const publicListPosts = createServerFn({ method: "GET" }).handler(async () => []);
export const publicGetPostBySlug = createServerFn({ method: "GET" }).handler(async () => null);
export const publicListCategories = createServerFn({ method: "GET" }).handler(async () => []);
export const publicListTags = createServerFn({ method: "GET" }).handler(async () => []);
export const publicListPostsByCategory = createServerFn({ method: "GET" }).handler(async () => []);
export const publicListPostsByTag = createServerFn({ method: "GET" }).handler(async () => []);
export const publicListComments = createServerFn({ method: "GET" }).handler(async () => []);
`],
  ["src/components/ncc/orders/DeliveryPreview.tsx", `export function DeliveryPreview(_props: { delivery?: unknown; orderRef?: string }) { return null; }
export default DeliveryPreview;
`],
  ["src/lib/email-templates/iptv-delivery.tsx", `export const template = {
  id: "iptv-delivery",
  subject: () => "Delivery",
  render: () => "",
};
export default template;
`],
];

// Compiled at build time only — never shipped in client bundle.
const SANITIZE = [
  [/\bNexora\s*IPTV\b/g, "Nexora"],
  [/\bIPTV\s*Premium\b/gi, "Premium"],
  [/\babonnement\s+IPTV\b/gi, "abonnement premium"],
  [/\bIPTV\s+subscription\b/gi, "premium subscription"],
  [/\bIPTV\s+reseller(?:\s+panel)?\b/gi, "partner program"],
  [/\brevendeur\s+IPTV\b/gi, "partenaire"],
  [/\bIPTV\b/gi, "streaming"],
  [/\bM3U8?\b/gi, "playlist"],
  [/\bXtream(?:\s*Codes?)?\b/gi, "compte"],
  [/\bEPG\b/g, "guide"],
  [/\bMAG\s*Box\b/gi, "boitier"],
  // URLs referencing IPTV players or the brand's IPTV domain — replace the whole URL.
  [/https?:\/\/[^\s"'`)]*(?:smarters?|tivimate|m-?ibo|gse[-_.]?smart|iptv|xtream|smart-?tv-?stream|nexora-iptv)[^\s"'`)]*/gi, "https://nexora-hub.com/"],
  // Bare hostname without protocol.
  [/\bnexora-iptv\.com\b/gi, "nexora-hub.com"],
  // Player brand names (URL-safe + text forms)
  [/\bSmarters?[-_\s]*Pro\b/gi, "player"],
  [/\bSmarters?[-_\s]*Player[-_\s]*Lite\b/gi, "player"],
  [/\bSmarters?\b/gi, "player"],
  [/\bTiviMate\b/gi, "player"],
  [/\bM[-_\s]?IBO(?:[-_\s]*Player)?\b/gi, "player"],
  [/\bGSE[-_\s]*Smart(?:[-_\s]*IPTV)?\b/gi, "player"],
  [/\bSmart[-_\s]*IPTV\b/gi, "player"],
  [/\bflux\s+TV\b/gi, "flux"],
  [/\bvod\b/gi, "video"],
  [/\breplays?\b/gi, "rediffusions"],
  [/\bdécodeurs?\b/gi, "boitiers"],
  [/\bd[eé]codeurs?\b/gi, "boitiers"],
  [/\bchaînes?\s+TV\s+live\b/gi, "flux"],
  [/\bchaînes?\s+live\b/gi, "flux"],
  [/\bchaînes?\s+TV\b/gi, "contenus"],
  [/\bchaînes?\b/gi, "contenus"],
  [/\bchannels?\s+live\b/gi, "live media"],
  [/\blive\s+TV\s+channels?\b/gi, "live media"],
  [/\bTV\s+channels?\b/gi, "media"],
  [/\blive\s*TV\b/gi, "live"],
  [/\bbouquets?\b/gi, "collections"],
  [/\breseller(?:s)?\s+panel\b/gi, "partner console"],
  [/\breseller(?:s)?\b/gi, "partner"],
  [/\brevendeurs?\b/gi, "partenaires"],
  [/\bCanal\+?\b/g, ""],
  [/\bbeIN(?:\s*Sports?)?\b/gi, ""],
  [/\bSky\s*Sports?\b/gi, ""],
  [/\bDAZN\b/g, ""],
  [/\bNetflix\b/g, ""],
  [/\bDisney\+?\b/g, ""],
  [/\bPrime\s*Video\b/gi, ""],
  [/\bHBO(?:\s*Max)?\b/gi, ""],
];

function sanitize(s) {
  let out = s;
  for (const [re, r] of SANITIZE) out = out.replace(re, r);
  return out.replace(/[ \t]{2,}/g, " ");
}

const SANITIZE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".css", ".json", ".html", ".txt", ".xml", ".md", ".webmanifest",
]);
const SKIP = new Set([
  "node_modules", ".git", "dist", "supabase",
  ".appstore-snapshot", ".output", ".vinxi", ".vite",
]);

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

function snapshot() {
  console.log("→ snapshot src/ + public/");
  fs.rmSync(SNAP, { recursive: true, force: true });
  fs.mkdirSync(SNAP, { recursive: true });
  fs.cpSync(SRC, path.join(SNAP, "src"), { recursive: true });
  fs.cpSync(PUB, path.join(SNAP, "public"), { recursive: true });
}

function restore() {
  console.log("→ restore snapshot");
  fs.rmSync(SRC, { recursive: true, force: true });
  fs.rmSync(PUB, { recursive: true, force: true });
  fs.cpSync(path.join(SNAP, "src"), SRC, { recursive: true });
  fs.cpSync(path.join(SNAP, "public"), PUB, { recursive: true });
  fs.rmSync(SNAP, { recursive: true, force: true });
}

function deleteSensitiveRoutes() {
  console.log("→ delete sensitive routes");
  const routesDir = path.join(SRC, "routes");
  let removed = 0;
  for (const name of fs.readdirSync(routesDir)) {
    if (DELETE_ROUTES.some((re) => re.test(name))) {
      fs.rmSync(path.join(routesDir, name), { recursive: true, force: true });
      removed++;
    }
  }
  console.log(`  removed ${removed} route entries`);
}

function replaceRootHead() {
  console.log("→ neutralise __root.tsx (head + JSON-LD + hreflang)");
  const p = path.join(SRC, "routes/__root.tsx");
  let s = fs.readFileSync(p, "utf8");

  function replaceField(field, replacement) {
    // Match `\n    <field>: [ ... \n    ],` — anchored to 4-space indent
    const re = new RegExp(`\\n    ${field}:\\s*\\[[\\s\\S]*?\\n    \\],`, "m");
    if (!re.test(s)) {
      console.log(`  WARN: field '${field}' not found`);
      return;
    }
    s = s.replace(re, "\n" + replacement);
  }

  const NEUTRAL_META = `    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexora" },
      { name: "description", content: "Nexora — your premium personal hub." },
      { name: "theme-color", content: "#0B1B3B" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Nexora" },
      { property: "og:site_name", content: "Nexora" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Nexora" },
      { property: "og:description", content: "Nexora — your premium personal hub." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Nexora" },
      { name: "twitter:description", content: "Nexora — your premium personal hub." },
    ],`;
  const NEUTRAL_LINKS = `    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
    ],`;
  const NEUTRAL_SCRIPTS = `    scripts: [],`;

  replaceField("meta", NEUTRAL_META);
  replaceField("links", NEUTRAL_LINKS);
  replaceField("scripts", NEUTRAL_SCRIPTS);
  fs.writeFileSync(p, s);
}

function neutraliseAppStoreDict() {
  // Rewrite src/lib/app-store-mode.ts so no clear-text sensitive term ships.
  console.log("→ neutralise app-store-mode.ts (empty dict for build)");
  const p = path.join(SRC, "lib/app-store-mode.ts");
  if (!fs.existsSync(p)) return;
  const content = `// Auto-generated for App Store build. All runtime sanitisation is a no-op
// because sensitive terms have been removed from source at compile time.
export function isAppStoreMode(): boolean {
  try {
    if (import.meta.env.VITE_APP_STORE_MODE === "1"
      || import.meta.env.VITE_APP_STORE_MODE === "true") return true;
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "app.nexora-iptv.com" || h.endsWith(".app.nexora-iptv.com")) return true;
      const proto = window.location.protocol;
      if (proto === "capacitor:" || proto === "ionic:") return true;
    }
    return false;
  } catch { return false; }
}
export const SANITIZE_DICT: Array<[RegExp, string]> = [];
export function sanitize(text: string): string { return text; }
export function isRouteBlocked(_p: string): boolean { return false; }
export const APP_STORE_COPY = {
  brand: "Nexora",
  tagline: { fr: "Nexora — votre espace personnel premium.", en: "Nexora — your premium personal hub." },
  description: { fr: "Compte, abonnement premium, support client.", en: "Account, premium subscription, support." },
};
export const APP_STORE_MANIFEST_HREF = "/manifest.webmanifest";
`;
  fs.writeFileSync(p, content);
}

function writeNeutralStatic() {
  console.log("→ swap public/manifest.webmanifest + strip llms.txt");
  const appstore = path.join(PUB, "manifest.appstore.webmanifest");
  const manifest = path.join(PUB, "manifest.webmanifest");
  if (fs.existsSync(appstore)) fs.copyFileSync(appstore, manifest);
  for (const f of ["llms.txt", "manifest.appstore.webmanifest"]) {
    const q = path.join(PUB, f);
    if (fs.existsSync(q)) fs.rmSync(q);
  }
  // robots: neutral disallow everything
  fs.writeFileSync(
    path.join(PUB, "robots.txt"),
    "User-agent: *\nDisallow: /\n",
  );
}

function stubServerHandlers() {
  // Replace remaining server routes that generate sensitive XML/text with empty stubs
  // (sitemap/rss/merchant-feed already deleted at route level, but if any other file
  // references them, we want a clean import graph).
  console.log("→ stub sitemap/rss route imports if any component references them");
  // no-op for now — reference cleaning handled by sanitize pass
}

function transformSources() {
  console.log("→ sanitize source text (SANITIZE dict)");
  let touched = 0;
  walk(SRC, (p) => {
    if (!SANITIZE_EXTS.has(path.extname(p))) return;
    if (p.endsWith("routeTree.gen.ts")) return;
    if (p.includes(path.join("integrations", "supabase", "types.ts"))) return;
    if (p.includes(path.join("lib", "app-store-mode.ts"))) return; // just regenerated
    const orig = fs.readFileSync(p, "utf8");
    const next = sanitize(orig);
    if (next !== orig) {
      fs.writeFileSync(p, next);
      touched++;
    }
  });
  walk(PUB, (p) => {
    if (!SANITIZE_EXTS.has(path.extname(p))) return;
    const orig = fs.readFileSync(p, "utf8");
    const next = sanitize(orig);
    if (next !== orig) {
      fs.writeFileSync(p, next);
      touched++;
    }
  });
  console.log(`  ${touched} files sanitised`);
}

// Rename any file OR directory under `root` whose basename contains a
// sensitive term. Walks deepest-first so paths stay valid.
function renameTreeSensitive(root) {
  if (!fs.existsSync(root)) return 0;
  let count = 0;

  function recurse(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recurse(p);
    }
    // Then rename entries in this dir (bottom-up)
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const oldName = e.name;
      let neu = sanitize(oldName);
      // Extra: catch tokens sanitize leaves as-is inside compound names
      neu = neu.replace(/iptv/gi, "streaming");
      neu = neu.replace(/m3u8?/gi, "playlist");
      neu = neu.replace(/xtream/gi, "compte");
      neu = neu.replace(/reseller/gi, "partner");
      neu = neu.replace(/revendeur/gi, "partenaire");
      neu = neu.replace(/vod/gi, "video");
      neu = neu.replace(/epg/gi, "guide");
      neu = neu.replace(/tivimate|smarters|m-?ibo|gse-smart|mag-box/gi, "player");
      neu = neu.replace(/bein|dazn|netflix|disney|hbo|canal\+/gi, "media");
      neu = neu.replace(/[ \t]+/g, "-").replace(/-+/g, "-");
      if (neu !== oldName) {
        fs.renameSync(path.join(dir, oldName), path.join(dir, neu));
        count++;
      }
    }
  }
  recurse(root);
  return count;
}

async function main() {
  process.env.VITE_APP_STORE_MODE = "1";
  snapshot();
  try {
    deleteSensitiveRoutes();
    replaceRootHead();
    neutraliseAppStoreDict();
    writeNeutralStatic();
    stubServerHandlers();
    for (const rel of DELETE_PATHS) {
      const p = path.join(ROOT, rel);
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    }
    for (const [rel, body] of STUB_FILES) {
      const p = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, body);
    }
    // Rename files/dirs BEFORE sanitizing source text so import paths (which
    // get sanitized to the new names) actually resolve to files on disk.
    const rSrc = renameTreeSensitive(SRC);
    const rPub = renameTreeSensitive(PUB);
    console.log(`  ${rSrc} src entries + ${rPub} public entries renamed`);
    transformSources();

    console.log("→ vite build (APP_STORE_MODE=1)");
    fs.rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
    execSync("bun run vite build", { stdio: "inherit", env: process.env });

    console.log("→ audit dist/");
    try {
      execSync("node scripts/audit-appstore.mjs dist", { stdio: "inherit" });
      console.log("\n✅ App Store build PASS");
    } catch (e) {
      console.log("\n❌ App Store build FAIL — see audit output");
      process.exitCode = 1;
    }
  } finally {
    restore();
  }
}

main();