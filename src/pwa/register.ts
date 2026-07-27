// Guarded service-worker registration for the Nexora PWA.
// Per the Lovable PWA skill: never register in dev, iframe, Lovable
// preview hosts, or when the URL carries ?sw=off. In any refused
// context, actively unregister any pre-existing /sw.js so a stale
// installation from a previous build can't keep serving cached HTML.

import type { Workbox } from "workbox-window";
import { isCapacitorNative } from "@/lib/runtime-env";

const PREVIEW_HOST_PREFIXES = ["id-preview--", "preview--"];
const PREVIEW_HOST_SUFFIXES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (isCapacitorNative()) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (PREVIEW_HOST_PREFIXES.some((p) => host.startsWith(p))) return true;
  if (
    PREVIEW_HOST_SUFFIXES.some(
      (s) => host === s || host.endsWith("." + s),
    )
  )
    return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterExisting(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        if (url.endsWith("/sw.js")) await r.unregister();
      }),
    );
  } catch {
    /* noop */
  }
}

export type PwaUpdateListener = (wb: Workbox) => void;

export async function registerPwa(onUpdateAvailable?: PwaUpdateListener): Promise<void> {
  if (isRefusedContext()) {
    await unregisterExisting();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js", { scope: "/" });
    wb.addEventListener("waiting", () => onUpdateAvailable?.(wb));
    await wb.register();
  } catch (err) {
    console.warn("[pwa] registration failed", err);
  }
}