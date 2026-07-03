// Sprint 3 · Bloc D — Subresource Integrity helper.
//
// The app currently ships zero pinned third-party <script> tags. Google
// Fonts CSS is dynamic and cannot be SRI-pinned (Google returns a different
// stylesheet per User-Agent), so it stays whitelisted in `connect-src` /
// `font-src` only. This helper exists so any FUTURE static third-party asset
// (e.g. an analytics beacon on a fixed CDN version) is added with SRI from
// day one. Do NOT introduce a third-party <script> without going through
// this helper.
//
// Usage:
//   import { sriLink } from "@/lib/sri";
//   sriLink({
//     href: "https://cdn.example.com/foo@1.2.3/foo.min.js",
//     integrity: "sha384-…",
//   });

export interface SriAsset {
  href: string;
  /** Full SRI value, e.g. `sha384-abc…` (see MDN docs). */
  integrity: string;
  /** `anonymous` unless the asset explicitly needs credentials. */
  crossOrigin?: "anonymous" | "use-credentials";
}

export function sriLink(asset: SriAsset) {
  return {
    rel: "stylesheet",
    href: asset.href,
    integrity: asset.integrity,
    crossOrigin: asset.crossOrigin ?? "anonymous",
  } as const;
}

export function sriScript(asset: SriAsset) {
  return {
    src: asset.href,
    integrity: asset.integrity,
    crossOrigin: asset.crossOrigin ?? "anonymous",
  } as const;
}
