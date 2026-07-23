import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider, useT } from "../i18n/context";
import { FloatingAiAssistant } from "../components/FloatingAiAssistant";
import { PwaManager } from "../components/pwa/PwaManager";
import { BackButton } from "../components/BackButton";
import { NexoraAssistantWidget } from "../components/ai-chat/NexoraAssistantWidget";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("nf.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("nf.sub")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("nf.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("err.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("err.sub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("err.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("err.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexora IPTV" },
      { name: "description", content: "Premium IPTV service with thousands of live channels, movies and series in HD/FHD/4K." },
      { name: "author", content: "Nexora IPTV" },
      { name: "theme-color", content: "#0F172A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Nexora" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:site_name", content: "Nexora IPTV" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Nexora IPTV — Unlimited Entertainment. One Subscription." },
      { name: "twitter:description", content: "Premium IPTV service. Access thousands of channels, movies and series in HD/FHD/4K on Smart TV, mobile, tablet and PC." },
      { name: "google-site-verification", content: "jSv5Ft_Y3UYQrjJ9V7wZZW0mPbS1C3CweOLs7Sa2JfY" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" },
      { rel: "alternate", hrefLang: "fr", href: "https://nexora-iptv.com/fr" },
      { rel: "alternate", hrefLang: "en", href: "https://nexora-iptv.com/en" },
      { rel: "alternate", hrefLang: "de", href: "https://nexora-iptv.com/de" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nexora-iptv.com/" },
      { rel: "alternate", type: "application/rss+xml", title: "Blog Nexora IPTV — RSS", href: "https://nexora-iptv.com/rss.xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Nexora IPTV",
              url: "https://nexora-iptv.com",
              logo: "https://nexora-iptv.com/pwa-512.png",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              name: "Nexora IPTV",
              url: "https://nexora-iptv.com",
            },
            {
              "@type": "Service",
              name: "Nexora IPTV Subscription",
              provider: { "@type": "Organization", name: "Nexora IPTV" },
              areaServed: "Worldwide",
              serviceType: "IPTV streaming subscription",
              description: "Premium IPTV with thousands of live channels, movies and series in HD/FHD/4K across Smart TV, mobile, tablet and PC.",
            },
          ],
        }),
      },
      {
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-MFZ9FD4YMB",
      },
      {
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MFZ9FD4YMB');
        `,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <FloatingWhatsApp />
        <BackButton />
        <PwaManager />
        <NexoraAssistantWidget />
      </I18nProvider>
    </QueryClientProvider>
  );
}
