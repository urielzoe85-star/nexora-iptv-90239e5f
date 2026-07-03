#!/usr/bin/env node
// Sprint 3 · Bloc D — Artifact signing.
//
// Walks a build output directory (default: ./dist) and produces
// `SHA256SUMS` (one <sha256>  <relative-path> line per file) plus a JSON
// manifest with build metadata. If `ARTIFACT_SIGNING_KEY` is set to a hex
// or base64 32-byte ed25519 seed, we also emit `SHA256SUMS.sig`.
//
// The manifest is stored under docs/releases/<release>/artifacts/ so every
// GA build is reproducible-verifiable: a verifier can recompute sha256 for
// each file and check the signature with the public key committed in
// docs/releases/sprint-3/bloc-d/PUBLIC_KEY.txt.
//
// Usage:
//   node scripts/sign-artifacts.mjs --dir dist --out docs/releases/v1.0.0-ga/artifacts

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { relative, resolve, join, dirname } from "node:path";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dir: "dist", out: "artifacts", release: process.env.RELEASE_TAG || "dev" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir") out.dir = args[++i];
    else if (args[i] === "--out") out.out = args[++i];
    else if (args[i] === "--release") out.release = args[++i];
  }
  return out;
}

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) results.push(...walk(full));
    else if (st.isFile()) results.push(full);
  }
  return results;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function maybeSign(payload) {
  const raw = process.env.ARTIFACT_SIGNING_KEY;
  if (!raw) return null;
  const seed = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (seed.length !== 32) {
    throw new Error("ARTIFACT_SIGNING_KEY must be 32 bytes (hex or base64)");
  }
  const { generateKeyPairSync, sign } = await import("node:crypto");
  // Node has no direct "seed → ed25519 keypair" — derive via raw import.
  const { createPrivateKey } = await import("node:crypto");
  // PKCS#8 wrapper for a raw ed25519 seed.
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const pkcs8 = Buffer.concat([prefix, seed]);
  const key = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
  return sign(null, Buffer.from(payload), key).toString("base64");
}

async function main() {
  const opts = parseArgs();
  const root = resolve(opts.dir);
  const outDir = resolve(opts.out);
  mkdirSync(outDir, { recursive: true });

  const files = walk(root).sort();
  const lines = [];
  const entries = [];
  for (const f of files) {
    const rel = relative(root, f).split("\\").join("/");
    const buf = readFileSync(f);
    const digest = sha256(buf);
    lines.push(`${digest}  ${rel}`);
    entries.push({ path: rel, size: buf.length, sha256: digest });
  }
  const sums = lines.join("\n") + "\n";
  writeFileSync(join(outDir, "SHA256SUMS"), sums);

  const manifest = {
    release: opts.release,
    generated_at: new Date().toISOString(),
    dir: relative(process.cwd(), root),
    file_count: entries.length,
    total_bytes: entries.reduce((n, e) => n + e.size, 0),
    algorithm: "sha256",
    entries,
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const sig = await maybeSign(sums);
  if (sig) {
    writeFileSync(join(outDir, "SHA256SUMS.sig"), sig + "\n");
    console.log(`[sign-artifacts] signed ${entries.length} files → ${outDir}`);
  } else {
    console.log(
      `[sign-artifacts] checksummed ${entries.length} files → ${outDir} (no signing key, skipped .sig)`,
    );
  }
}

main().catch((err) => {
  console.error("[sign-artifacts] failed:", err);
  process.exit(1);
});
