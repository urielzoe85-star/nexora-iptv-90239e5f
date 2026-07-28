// Runtime environment detection helpers.
//
// isCapacitorNative() returns true when the app is executing inside the
// Capacitor Android/iOS WebView wrapper. In that context we suppress every
// PWA behaviour (install banner, service worker, beforeinstallprompt) so the
// APK behaves like a fully native app.

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
    __NEXORA_NATIVE__?: boolean;
  }
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  let nativeFlag = false;
  try {
    if (window.__NEXORA_NATIVE__ === true) nativeFlag = true;
  } catch {
    /* noop */
  }
  try {
    if (!nativeFlag && window.Capacitor?.isNativePlatform?.() === true) nativeFlag = true;
  } catch {
    /* noop */
  }
  try {
    if (!nativeFlag && typeof navigator !== "undefined" && /NexoraApp/i.test(navigator.userAgent)) {
      nativeFlag = true;
    }
  } catch {
    /* noop */
  }
  return nativeFlag;
}
