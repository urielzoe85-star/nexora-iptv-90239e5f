// Guarded service-worker registration for the Nexora PWA.
// Per the Lovable PWA skill: never register in dev, iframe, Lovable
// preview hosts, or when the URL carries ?sw=off. In any refused
// context, actively unregister any pre-existing /sw.js so a stale
// installation from a previous build can't keep serving cached HTML.

import type { Workbox } from "workbox-window";
import { isCapacitorNative } from "@/lib/runtime-env";
import { PWA_ENABLED } from "./config";
import { pwaLog, pwaWarn, recordPwaError, installPwaDebugListeners, collectPwaState } from "./debug";

const PREVIEW_HOST_PREFIXES = ["id-preview--", "preview--"];
const PREVIEW_HOST_SUFFIXES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
];

/** Renvoie la raison du refus, ou null si l'enregistrement est autorisé. */
function refusalReason(): string | null {
  if (typeof window === "undefined") return "ssr";
  if (!PWA_ENABLED) return "PWA_ENABLED=false";
  if (!import.meta.env.PROD) return "dev build";
  if (isCapacitorNative()) return "capacitor native";
  try {
    if (window.self !== window.top) return "iframe";
  } catch {
    return "iframe (cross-origin)";
  }
  const host = window.location.hostname;
  if (PREVIEW_HOST_PREFIXES.some((p) => host.startsWith(p))) return `preview host (${host})`;
  if (PREVIEW_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s))) {
    return `preview host (${host})`;
  }
  if (new URLSearchParams(window.location.search).get("sw") === "off") return "?sw=off";
  return null;
}

async function unregisterExisting(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        if (url.endsWith("/sw.js")) {
          await r.unregister();
          pwaLog("stale registration unregistered", url);
        }
      }),
    );
  } catch {
    /* noop */
  }
  // Purge des caches Workbox laissés par une installation précédente,
  // sinon un ancien SW peut continuer à servir du HTML périmé.
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    const stale = names.filter(
      (n) => /^(nexora-|workbox-|google-fonts)/.test(n) || /precache-v\d+-|(^|-)runtime-/.test(n),
    );
    await Promise.all(stale.map((n) => caches.delete(n)));
    if (stale.length) pwaLog("stale caches purged", stale);
  } catch {
    /* noop */
  }
}

export type PwaUpdateListener = (wb: Workbox) => void;

export async function registerPwa(onUpdateAvailable?: PwaUpdateListener): Promise<void> {
  installPwaDebugListeners();
  const refused = refusalReason();
  if (refused) {
    pwaWarn("registration refused", refused);
    await unregisterExisting();
    return;
  }
  if (!("serviceWorker" in navigator)) {
    pwaWarn("serviceWorker unsupported");
    return;
  }
  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js", { scope: "/" });
    wb.addEventListener("installing", () => pwaLog("lifecycle: installing"));
    wb.addEventListener("installed", (e) => pwaLog("lifecycle: installed", { isUpdate: e.isUpdate }));
    wb.addEventListener("activated", (e) => pwaLog("lifecycle: activated", { isUpdate: e.isUpdate }));
    wb.addEventListener("controlling", (e) => pwaLog("lifecycle: controlling", { isUpdate: e.isUpdate }));
    wb.addEventListener("redundant", () => pwaWarn("lifecycle: redundant"));
    wb.addEventListener("message", (e) => pwaLog("lifecycle: message", e.data));
    wb.addEventListener("waiting", () => {
      pwaLog("update available — SW en attente");
      onUpdateAvailable?.(wb);
    });
    const reg = await wb.register();
    pwaLog("registered", { scope: reg?.scope, scriptURL: reg?.active?.scriptURL ?? null });
    void collectPwaState().then((s) => pwaLog("state", s));
  } catch (err) {
    recordPwaError(`registration failed: ${String(err)}`);
    console.warn("[pwa] registration failed", err);
  }
}
