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
  }
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  let nativeFlag = false;
  try {
    if (window.Capacitor?.isNativePlatform?.() === true) nativeFlag = true;
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
  console.info(
    "[capacitor-detect] isNativePlatform=",
    window.Capacitor?.isNativePlatform?.(),
    "userAgent=",
    typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
    "result=",
    nativeFlag,
  );
  return nativeFlag;
}
