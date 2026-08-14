// Couche de debug du service worker Nexora.
//
// Désactivée par défaut : `pwaLog`/`pwaWarn` sont des no-op tant que le flag
// n'est pas armé. Activation par `?sw=debug` (persisté en localStorage),
// `localStorage.setItem("nexora.pwa.debug","1")`, coupure par `?sw=debug=off`.
// Aucune de ces fonctions ne modifie le comportement de cache de la PWA.

const FLAG_KEY = "nexora.pwa.debug";
const NEXORA_CACHE_RE = /^(nexora-|workbox-|google-fonts)|precache-v\d+-|(^|-)runtime-/;

let cached: boolean | null = null;

export function isPwaDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== null) return cached;
  let on = false;
  try {
    const raw = new URLSearchParams(window.location.search).get("sw");
    if (raw === "debug" || raw === "debug=on") {
      on = true;
      try { localStorage.setItem(FLAG_KEY, "1"); } catch { /* noop */ }
    } else if (raw === "debug=off") {
      on = false;
      try { localStorage.removeItem(FLAG_KEY); } catch { /* noop */ }
      cached = false;
      return false;
    }
    if (!on) {
      try { on = localStorage.getItem(FLAG_KEY) === "1"; } catch { /* noop */ }
    }
  } catch {
    /* noop */
  }
  cached = on;
  return on;
}

function stamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function pwaLog(event: string, detail?: unknown): void {
  if (!isPwaDebug()) return;
  if (detail === undefined) console.info(`[pwa ${stamp()}] ${event}`);
  else console.info(`[pwa ${stamp()}] ${event}`, detail);
}

export function pwaWarn(event: string, detail?: unknown): void {
  if (!isPwaDebug()) return;
  if (detail === undefined) console.warn(`[pwa ${stamp()}] ${event}`);
  else console.warn(`[pwa ${stamp()}] ${event}`, detail);
}

export type CacheReport = { name: string; entries: number };

export type PwaState = {
  debug: boolean;
  supported: boolean;
  controller: string | null;
  registrations: Array<{
    scope: string;
    scriptURL: string;
    state: string;
    hasWaiting: boolean;
  }>;
  caches: CacheReport[];
  totalEntries: number;
  usageMB: number | null;
  quotaMB: number | null;
  online: boolean;
  lastError: string | null;
};

let lastError: string | null = null;

export function recordPwaError(message: string): void {
  lastError = `${stamp()} — ${message}`;
  pwaWarn("error", message);
}

export function getLastPwaError(): string | null {
  return lastError;
}

export async function inspectCaches(): Promise<CacheReport[]> {
  if (typeof caches === "undefined") return [];
  try {
    const names = await caches.keys();
    return await Promise.all(
      names.map(async (name) => {
        try {
          const c = await caches.open(name);
          const keys = await c.keys();
          return { name, entries: keys.length };
        } catch {
          return { name, entries: -1 };
        }
      }),
    );
  } catch {
    return [];
  }
}

export async function collectPwaState(): Promise<PwaState> {
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const cacheReports = await inspectCaches();
  let usageMB: number | null = null;
  let quotaMB: number | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) {
      usageMB = est.usage ? Math.round((est.usage / 1048576) * 10) / 10 : 0;
      quotaMB = est.quota ? Math.round(est.quota / 1048576) : null;
    }
  } catch {
    /* noop */
  }

  const registrations: PwaState["registrations"] = [];
  if (supported) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const sw = r.active || r.installing || r.waiting;
        registrations.push({
          scope: r.scope,
          scriptURL: sw?.scriptURL ?? "",
          state: sw?.state ?? "unknown",
          hasWaiting: Boolean(r.waiting),
        });
      }
    } catch {
      /* noop */
    }
  }

  return {
    debug: isPwaDebug(),
    supported,
    controller: supported ? navigator.serviceWorker.controller?.scriptURL ?? null : null,
    registrations,
    caches: cacheReports,
    totalEntries: cacheReports.reduce((n, c) => n + Math.max(c.entries, 0), 0),
    usageMB,
    quotaMB,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastError,
  };
}

export async function clearNexoraCaches(): Promise<string[]> {
  const cleared: string[] = [];
  if (typeof caches === "undefined") return cleared;
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => NEXORA_CACHE_RE.test(n))
        .map(async (n) => {
          await caches.delete(n);
          cleared.push(n);
        }),
    );
  } catch (e) {
    recordPwaError(`clearNexoraCaches: ${String(e)}`);
  }
  pwaLog("caches cleared", cleared);
  return cleared;
}

export async function unregisterNexoraSw(): Promise<number> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return 0;
  let count = 0;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith("/sw.js")) {
        await r.unregister();
        count += 1;
      }
    }
  } catch (e) {
    recordPwaError(`unregisterNexoraSw: ${String(e)}`);
  }
  pwaLog("unregistered", count);
  return count;
}

let wired = false;

/** Trace les erreurs et bascules réseau qui expliquent les échecs de navigation. */
export function installPwaDebugListeners(): void {
  if (!isPwaDebug() || wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("online", () => pwaLog("network online"));
  window.addEventListener("offline", () => pwaWarn("network offline — navigations servies par le cache"));
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      pwaLog("controllerchange", navigator.serviceWorker.controller?.scriptURL ?? null);
    });
    navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
      pwaLog("sw message", e.data);
    });
    navigator.serviceWorker.addEventListener("error", (e: Event) => {
      recordPwaError(`serviceWorker error: ${(e as ErrorEvent).message ?? "unknown"}`);
    });
  }
  window.addEventListener("unhandledrejection", (e) => {
    const reason = String((e as PromiseRejectionEvent).reason ?? "");
    if (/service ?worker|workbox|cache|Failed to fetch/i.test(reason)) {
      recordPwaError(`navigation/fetch: ${reason}`);
    }
  });
  const w = window as unknown as Record<string, unknown>;
  w["__nexoraPwa"] = {
    state: collectPwaState,
    caches: inspectCaches,
    clearCaches: clearNexoraCaches,
    unregister: unregisterNexoraSw,
  };
  pwaLog("debug mode actif — window.__nexoraPwa disponible");
}
