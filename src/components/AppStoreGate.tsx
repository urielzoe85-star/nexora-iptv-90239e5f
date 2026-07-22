import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isAppStoreMode, isRouteBlocked, sanitize } from "@/lib/app-store-mode";

/**
 * Composant no-op quand le flag `VITE_APP_STORE_MODE` est absent.
 * Quand actif :
 *  - redirige toute route sensible vers "/"
 *  - installe un MutationObserver qui sanitize les Text nodes visibles
 *  - masque les éléments marqués `data-app-store="hide"`
 */
export function AppStoreGate() {
  const router = useRouter();

  useEffect(() => {
    if (!isAppStoreMode()) return;

    // 1) Route guard
    const guard = () => {
      const path = window.location.pathname;
      if (isRouteBlocked(path)) {
        router.navigate({ to: "/", replace: true });
      }
    };
    guard();
    const unsub = router.subscribe("onResolved", guard);

    // 2) DOM sanitizer
    const walk = (root: Node) => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const tag = p.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes: Text[] = [];
      let cur: Node | null = w.nextNode();
      while (cur) {
        nodes.push(cur as Text);
        cur = w.nextNode();
      }
      for (const t of nodes) {
        const before = t.nodeValue ?? "";
        const after = sanitize(before);
        if (after !== before) t.nodeValue = after;
      }
    };

    const sanitizeAttributes = (el: Element) => {
      for (const attr of ["alt", "title", "aria-label", "placeholder"]) {
        const v = el.getAttribute(attr);
        if (v) {
          const s = sanitize(v);
          if (s !== v) el.setAttribute(attr, s);
        }
      }
    };

    walk(document.body);
    document.body.querySelectorAll<HTMLElement>("[alt],[title],[aria-label],[placeholder]").forEach(sanitizeAttributes);
    // Masque les éléments explicitement retirés du mode App Store.
    document.body.querySelectorAll<HTMLElement>("[data-app-store='hide']").forEach((el) => {
      el.style.display = "none";
    });

    // Masque tous les liens vers des routes sensibles ou vers WhatsApp / Messenger.
    const SENSITIVE_HREF = /(wa\.me|api\.whatsapp\.com|whatsapp\.com|m\.me|messenger\.com|\/produits|\/reseller|\/catalog|\/galerie|\/gallery|\/blog|\/downloads|\/guide-iptv|\/legal-guide)/i;
    const hideSensitiveLinks = (root: ParentNode) => {
      root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (SENSITIVE_HREF.test(href)) {
          a.style.display = "none";
          a.setAttribute("aria-hidden", "true");
          a.setAttribute("tabindex", "-1");
        }
      });
    };
    hideSensitiveLinks(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
          const t = m.target as Text;
          const s = sanitize(t.nodeValue ?? "");
          if (s !== t.nodeValue) t.nodeValue = s;
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) {
              const t = n as Text;
              const s = sanitize(t.nodeValue ?? "");
              if (s !== t.nodeValue) t.nodeValue = s;
            } else if (n.nodeType === Node.ELEMENT_NODE) {
              walk(n);
              (n as Element).querySelectorAll?.<HTMLElement>("[alt],[title],[aria-label],[placeholder]").forEach(sanitizeAttributes);
              (n as Element).querySelectorAll?.<HTMLElement>("[data-app-store='hide']").forEach((el) => {
                el.style.display = "none";
              });
              hideSensitiveLinks(n as Element);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    // 3) Meta & manifest overrides
    document.title = sanitize(document.title);
    const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (manifestLink) manifestLink.href = "/manifest.appstore.webmanifest";
    document.documentElement.setAttribute("data-app-store-mode", "1");

    // Inject robots noindex once
    if (!document.querySelector("meta[name='robots'][data-appstore]")) {
      const m = document.createElement("meta");
      m.setAttribute("name", "robots");
      m.setAttribute("content", "noindex,nofollow,noarchive");
      m.setAttribute("data-appstore", "1");
      document.head.appendChild(m);
    }

    // Sanitize meta tags (description, og:*, twitter:*) and strip canonical/hreflang
    const sweepMeta = () => {
      document.querySelectorAll<HTMLMetaElement>(
        "meta[name='description'],meta[name='twitter:title'],meta[name='twitter:description'],meta[property^='og:']"
      ).forEach((el) => {
        const v = el.getAttribute("content");
        if (v) {
          const s = sanitize(v);
          if (s !== v) el.setAttribute("content", s);
        }
      });
      document.querySelectorAll<HTMLLinkElement>(
        "link[rel='canonical'],link[rel='alternate'][hreflang]"
      ).forEach((el) => el.parentElement?.removeChild(el));
    };
    sweepMeta();
    const metaObs = new MutationObserver(sweepMeta);
    metaObs.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content", "href"] });

    return () => {
      observer.disconnect();
      metaObs.disconnect();
      unsub();
    };
  }, [router]);

  return null;
}
