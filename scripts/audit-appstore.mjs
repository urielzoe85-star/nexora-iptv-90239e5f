#!/usr/bin/env node
// Static App Store audit: scans dist/ for prohibited terms and reports findings.
// Usage: node scripts/audit-appstore.mjs [distDir]
import fs from "node:fs";
import path from "node:path";

const DIST = process.argv[2] || "dist";
if (!fs.existsSync(DIST)) {
  console.error(`ERR: ${DIST} not found. Run: VITE_APP_STORE_MODE=1 bun run build`);
  process.exit(2);
}

// Superset of SANITIZE_DICT — every term Apple review flags for IPTV apps.
const TERMS = [
  ["iptv", /\biptv\b/i],
  ["m3u/m3u8", /\bm3u8?\b/i],
  ["xtream", /\bxtream\b/i],
  ["epg", /\bepg\b/i],
  ["vod", /\bvod\b/i],
  ["replay", /\breplays?\b/i],
  ["bouquet", /\bbouquets?\b/i],
  ["revendeur", /\brevendeurs?\b/i],
  ["reseller", /\breseller\b/i],
  ["décodeur", /\bd[eé]codeurs?\b/i],
  ["chaîne TV", /\bcha[iî]nes?\s*tv\b/i],
  ["chaînes live", /\bcha[iî]nes?\s+live\b/i],
  ["live TV", /\blive\s*tv\b/i],
  ["TV channels", /\btv\s+channels?\b/i],
  ["smart iptv", /\bsmart\s*iptv\b/i],
  ["smarters", /\bsmarters?\b/i],
  ["tivimate", /\btivimate\b/i],
  ["m-ibo", /\bm-?ibo\b/i],
  ["gse smart", /\bgse\s+smart\b/i],
  ["mag box", /\bmag\s*box\b/i],
  ["canal+", /\bcanal\+/i],
  ["bein sports", /\bbein\s*sports?\b/i],
  ["sky sports", /\bsky\s*sports?\b/i],
  ["dazn", /\bdazn\b/i],
  ["netflix", /\bnetflix\b/i],
  ["disney+", /\bdisney\+/i],
  ["prime video", /\bprime\s*video\b/i],
  ["hbo", /\bhbo\b/i],
];

// Allowed exceptions (false positives that don't ship IPTV terminology).
const ALLOW = [
  // "reseller" appears in Stripe/PayPal legal boilerplate — no.
];

// Skip these paths entirely — 3rd-party library internals whose identifiers
// (e.g. React's `createReplayTask`, TanStack Router's `replay` param) are
// non-user-visible API names and cannot be renamed.
const SKIP_PATHS = [
  /^server\/_libs\//,
  /^server\/_ssr\/routes-/,
  /^server\/_ssr\/context-/,
  /^client\/assets\/server\.browser-/,
  /^client\/assets\/dist-/,           // prism.js highlighting lib
  /^client\/assets\/react(-|_)/,
  /^client\/assets\/react-dom-/,
  /^client\/assets\/chunk-/,
];

const EXTS = new Set([".html", ".js", ".mjs", ".cjs", ".css", ".json", ".webmanifest", ".txt", ".xml", ".svg"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(DIST);
const findings = [];
let scannedBytes = 0;

for (const f of files) {
  const rel = path.relative(DIST, f);
  if (SKIP_PATHS.some((re) => re.test(rel))) continue;
  const buf = fs.readFileSync(f);
  scannedBytes += buf.length;
  const text = buf.toString("utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of TERMS) {
      if (re.test(line)) {
        const snippet = line.trim().slice(0, 200);
        if (ALLOW.some((a) => a.test(snippet))) continue;
        findings.push({ file: rel, line: i + 1, term: name, snippet });
      }
    }
  });
}

// Also flag image asset filenames that leak intent.
const imgFiles = [];
function walkAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(p);
    else if (/\.(png|jpe?g|webp|svg|gif|avif)$/i.test(e.name)) imgFiles.push(p);
  }
}
walkAll(DIST);
const imgLeaks = imgFiles.filter((p) =>
  TERMS.some(([, re]) => re.test(path.basename(p))),
);

// Emit a machine-readable summary.
const summary = {
  distDir: DIST,
  scannedFiles: files.length,
  scannedBytes,
  imageFiles: imgFiles.length,
  imageNameLeaks: imgLeaks.map((p) => path.relative(DIST, p)),
  findings,
  pass: findings.length === 0 && imgLeaks.length === 0,
};

fs.mkdirSync("docs/releases/appstore", { recursive: true });
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const jsonPath = `docs/releases/appstore/audit-${stamp}.json`;
fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

console.log(`Scanned ${files.length} files (${(scannedBytes / 1024).toFixed(1)} KB), ${imgFiles.length} images.`);
if (summary.pass) {
  console.log("✅ PASS — aucune occurrence de terme sensible.");
} else {
  console.log(`❌ FAIL — ${findings.length} occurrence(s), ${imgLeaks.length} image(s) suspecte(s).`);
  for (const f of findings.slice(0, 30)) {
    console.log(`  ${f.file}:${f.line}  [${f.term}]  ${f.snippet}`);
  }
  if (findings.length > 30) console.log(`  … +${findings.length - 30} more`);
}
console.log(`Report: ${jsonPath}`);
process.exit(summary.pass ? 0 : 1);