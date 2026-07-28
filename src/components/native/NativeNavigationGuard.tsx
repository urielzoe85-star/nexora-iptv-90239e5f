import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { isCapacitorNative } from "@/lib/runtime-env";

const NEXORA_HOSTS = new Set([
  "nexora-iptv.com",
  "www.nexora-iptv.com",
  "app.nexora-iptv.com",
  "account.nexora-iptv.com",
]);

const DIAGNOSTIC_KEY = "nexora.native.navigation.last";

type NavigationDiagnostic = {
  method: string;
  target: string;
  source: string;
  timestamp: string;
};

function safeTarget(value: string): string {
  try {
    const url = new URL(value, window.location.href);
    return `${url.origin}${url.pathname}${url.hash}`;
  } catch {
    return value.slice(0, 240);
  }
}

function saveDiagnostic(method: string, target: string): NavigationDiagnostic {
  const diagnostic: NavigationDiagnostic = {
    method,
    target: safeTarget(target),
    source: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(diagnostic));
  } catch {
    // Storage may be unavailable in hardened WebViews.
  }
  console.warn("[native-navigation] blocked external navigation", diagnostic);
  return diagnostic;
}

function sameWebViewUrl(url: URL): string {
  return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
}

export function NativeNavigationGuard() {
  const [blocked, setBlocked] = useState<NavigationDiagnostic | null>(null);

  useEffect(() => {
    if (!isCapacitorNative()) return;

    let lastExplicitInteraction = 0;
    const markExplicitInteraction = () => {
      lastExplicitInteraction = Date.now();
    };
    const originalOpen = window.open.bind(window);
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const rawTarget = url?.toString() ?? "";
      if (!rawTarget) return originalOpen(url, target, features);

      let parsed: URL;
      try {
        parsed = new URL(rawTarget, window.location.href);
      } catch {
        const diagnostic = saveDiagnostic("window.open:invalid", rawTarget);
        setBlocked(diagnostic);
        return null;
      }

      if (NEXORA_HOSTS.has(parsed.hostname)) {
        window.location.href = sameWebViewUrl(parsed);
        return window;
      }

      if (Date.now() - lastExplicitInteraction > 1_000) {
        const diagnostic = saveDiagnostic("window.open:automatic", parsed.href);
        setBlocked(diagnostic);
        return null;
      }

      return originalOpen(parsed.href, target, features);
    }) as typeof window.open;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (NEXORA_HOSTS.has(url.hostname)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = sameWebViewUrl(url);
        return;
      }

      if (anchor.target === "_blank" && Date.now() - lastExplicitInteraction > 1_000) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const diagnostic = saveDiagnostic("anchor:automatic", url.href);
        setBlocked(diagnostic);
      }
    };

    document.addEventListener("pointerdown", markExplicitInteraction, true);
    document.addEventListener("keydown", markExplicitInteraction, true);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.open = originalOpen;
      document.removeEventListener("pointerdown", markExplicitInteraction, true);
      document.removeEventListener("keydown", markExplicitInteraction, true);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  if (!blocked) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-lg items-start gap-3 rounded-md border border-destructive/40 bg-background p-3 text-foreground shadow-lg"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">Navigation externe bloquée</p>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {blocked.method} · {blocked.target}
        </p>
      </div>
    </div>
  );
}