import { createFileRoute, Link } from "@tanstack/react-router";
import heroBg from "@/assets/hero-bg.jpg";
import devicesMain from "@/assets/devices/devices-main.jpg.asset.json";
import deviceSmartTv from "@/assets/devices/device-smarttv.jpg.asset.json";
import deviceAndroidTv from "@/assets/devices/device-androidtv.jpg.asset.json";
import deviceFireTv from "@/assets/devices/device-firetv.jpg.asset.json";
import deviceSmartphone from "@/assets/devices/device-smartphone.jpg.asset.json";
import deviceTablet from "@/assets/devices/device-tablet.jpg.asset.json";
import deviceLaptop from "@/assets/devices/device-laptop.jpg.asset.json";
import deviceDesktop from "@/assets/devices/device-desktop.jpg.asset.json";
import downloadIos from "@/assets/download-ios.jpg";
import downloadAndroid from "@/assets/download-android.jpg";
import downloadWindows from "@/assets/download-windows.jpg";
import danielPhoto from "@/assets/testimonial-daniel.jpg.asset.json";
import ameliePhoto from "@/assets/testimonial-amelie.jpg.asset.json";
import carlosPhoto from "@/assets/testimonial-carlos.jpg.asset.json";
import fatouPhoto from "@/assets/testimonial-fatou.jpg.asset.json";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tv, Film, Zap, Globe2, ShieldCheck, Headphones,
  Check, Star, MessageCircle, Send, Mail, Menu,
  Download, Share2, Facebook, Twitter, Link2,
  BadgeCheck,
} from "lucide-react";
import { useT, useI18n } from "@/i18n/context";
import { LanguageSwitcher } from "@/i18n/context";
import { buildWhatsAppLink } from "@/lib/whatsapp-contact";
import { PORTAL_HOST, PORTAL_BASE_URL } from "@/lib/portal-url";

const TELEGRAM_BOT_URL = "https://t.me/NexoraIPTVBot";
const SUPPORT_EMAIL = "info@nexora-iptv.com";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPlans, type PublicPlan } from "@/lib/plans.functions";
import { publicListPosts } from "@/lib/blog.functions";
import { PostCard } from "@/components/blog/PostCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Premium IPTV Subscription, Instant Activation" },
      { name: "description", content: "Premium IPTV with thousands of channels, movies & series in HD/FHD/4K. Instant activation, multi-device, 24/7 support." },
      { property: "og:title", content: "Nexora IPTV — Premium IPTV Subscription" },
      { property: "og:description", content: "Thousands of live channels & VOD. Instant access. Multi-device." },
      { property: "og:url", content: "https://nexora-iptv.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://nexora-iptv.com/" },
      { rel: "preload", as: "image", href: heroBg, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "How fast is activation?", acceptedAnswer: { "@type": "Answer", text: "Most subscriptions are activated within 5–10 minutes after payment is confirmed. You receive credentials by email and on WhatsApp." } },
            { "@type": "Question", name: "Can I use multiple devices?", acceptedAnswer: { "@type": "Answer", text: "Yes. Every plan includes multi-device support so you can stream on your TV, phone, tablet and laptop." } },
            { "@type": "Question", name: "Do I need special equipment?", acceptedAnswer: { "@type": "Answer", text: "No. Any modern Smart TV, Android/iOS device, Fire Stick, or computer with a stable internet connection works perfectly." } },
            { "@type": "Question", name: "Which devices are supported?", acceptedAnswer: { "@type": "Answer", text: "Smart TVs (Samsung, LG, Sony), Android TV, Fire TV Stick, Apple TV, smartphones, tablets, MAG boxes, and Windows/Mac." } },
            { "@type": "Question", name: "How do I contact support?", acceptedAnswer: { "@type": "Answer", text: "We're available 24/7 on WhatsApp, Telegram and email. Average response time is under 5 minutes." } },
          ],
        }),
      },
    ],
  }),
  component: NexoraLanding,
});

function isPortalHost() {
  return typeof window !== "undefined" && window.location.hostname === PORTAL_HOST;
}

function PortalClientLink({ className, onClick, children }: { className?: string; onClick?: () => void; children: ReactNode }) {
  // On ne redirige vers le sous-domaine account.* que depuis le site
  // marketing de production (www.nexora-iptv.com / nexora-iptv.com).
  // Sur l'aperçu Lovable, les URL *.lovable.app et le dev local, on garde
  // la navigation interne pour que l'espace client s'ouvre correctement.
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isMarketingProd = hostname === "www.nexora-iptv.com" || hostname === "nexora-iptv.com";
  if (isMarketingProd) {
    return <a href={`${PORTAL_BASE_URL}/espace-client`} className={className} onClick={onClick}>{children}</a>;
  }
  return <Link to="/espace-client" className={className} onClick={onClick}>{children}</Link>;
}

export function NexoraLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Features />
        <Devices />
        <Pricing />
        <HowItWorks />
        <Downloads />
        <Testimonials />
        <FAQ />
        <LatestPosts />
        <Payments />
        <Share />
        <Support />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function Nav() {
  const t = useT();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
          <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">{t("nav.features")}</a>
          <a href="#devices" className="hover:text-foreground transition">{t("nav.devices")}</a>
          <a href="#pricing" className="hover:text-foreground transition">{t("nav.pricing")}</a>
          <Link to="/catalog" className="hover:text-foreground transition">{t("nav.catalog")}</Link>
          <Link to="/galerie" className="hover:text-foreground transition">Galerie</Link>
          <Link to="/blog" className="hover:text-foreground transition">Blog</Link>
          <a href="#faq" className="hover:text-foreground transition">{t("nav.faq")}</a>
          <a href="#support" className="hover:text-foreground transition">{t("nav.support")}</a>
          <PortalClientLink className="hover:text-foreground transition">Espace client</PortalClientLink>
          {locale === "fr" && (
            <Link to="/fr/guide-iptv" className="hover:text-foreground transition">Guide d'installation</Link>
          )}
          {locale === "en" && (
            <Link to="/en/guide-iptv" className="hover:text-foreground transition">Setup guide</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a href="#pricing" className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-sm font-semibold hidden sm:inline-block">{t("nav.getStarted")}</a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            className="md:hidden text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-[color:var(--gold)]/10 glass">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 text-sm text-muted-foreground">
            <a href="#features" onClick={close} className="hover:text-foreground transition">{t("nav.features")}</a>
            <a href="#devices" onClick={close} className="hover:text-foreground transition">{t("nav.devices")}</a>
            <a href="#pricing" onClick={close} className="hover:text-foreground transition">{t("nav.pricing")}</a>
            <Link to="/catalog" onClick={close} className="hover:text-foreground transition">{t("nav.catalog")}</Link>
            <Link to="/galerie" onClick={close} className="hover:text-foreground transition">Galerie</Link>
            <Link to="/blog" onClick={close} className="hover:text-foreground transition">Blog</Link>
            <a href="#faq" onClick={close} className="hover:text-foreground transition">{t("nav.faq")}</a>
            <a href="#support" onClick={close} className="hover:text-foreground transition">{t("nav.support")}</a>
            <PortalClientLink onClick={close} className="hover:text-foreground transition">Espace client</PortalClientLink>
            {locale === "fr" && (
              <Link to="/fr/guide-iptv" onClick={close} className="hover:text-foreground transition">Guide d'installation</Link>
            )}
            {locale === "en" && (
              <Link to="/en/guide-iptv" onClick={close} className="hover:text-foreground transition">Setup guide</Link>
            )}
            <a href="#pricing" onClick={close} className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-sm font-semibold text-center sm:hidden">{t("nav.getStarted")}</a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const t = useT();
  const points = [t("hero.point.1"), t("hero.point.2"), t("hero.point.3"), t("hero.point.4")];
  return (
    <section id="top" className="relative min-h-screen flex items-center pt-24 overflow-hidden">
      <img src={heroBg} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-50" fetchPriority="high" loading="eager" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center w-full">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <span className="h-2 w-2 rounded-full bg-[color:var(--gold)] animate-pulse" />
            {t("hero.badge")}
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
            {t("hero.title.a")}<span className="text-gradient-gold">{t("hero.title.b")}</span>{t("hero.title.c")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">{t("hero.subtitle")}</p>
          <div className="flex flex-wrap gap-4 mb-10">
            <a href="#pricing" className="btn-gold btn-gold-hover px-7 py-3.5 rounded-full font-semibold">{t("hero.cta.start")}</a>
            <a href="#pricing" className="glass px-7 py-3.5 rounded-full font-semibold hover:border-[color:var(--gold)]/40 transition">{t("hero.cta.plans")}</a>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--gold)]" />{p}</li>
            ))}
          </ul>
        </div>
        <div className="hidden lg:block relative" style={{ animation: "float-slow 6s ease-in-out infinite" }}>
          <div className="absolute -inset-10 bg-[color:var(--gold)]/20 blur-3xl rounded-full" />
          <img
            src={devicesMain.url}
            alt="Streaming on Smart TV, phone, tablet and laptop"
            width={1344}
            height={768}
            className="relative rounded-2xl glass p-3 object-cover"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const t = useT();
  const items = [
    { Icon: Tv, k: 1 }, { Icon: Film, k: 2 }, { Icon: Zap, k: 3 },
    { Icon: Globe2, k: 4 }, { Icon: ShieldCheck, k: 5 }, { Icon: Headphones, k: 6 },
  ];
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("features.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("features.title.a")}<span className="text-gradient-gold">{t("features.title.b")}</span></h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ Icon, k }) => (
            <div key={k} className="group glass rounded-2xl p-8 hover:border-[color:var(--gold)]/40 transition hover-scale">
              <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)] grid place-items-center text-black mb-5 group-hover:scale-110 transition">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t(`features.${k}.title`)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(`features.${k}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Devices() {
  const t = useT();
  const devices = [
    { photo: deviceSmartTv.url, key: "devices.smartTv", label: "Smart TV" },
    { photo: deviceAndroidTv.url, key: "devices.androidTv", label: "Android TV" },
    { photo: deviceFireTv.url, key: "devices.fireTv", label: "Fire TV" },
    { photo: deviceSmartphone.url, key: "devices.smartphone", label: "Smartphone" },
    { photo: deviceTablet.url, key: "devices.tablet", label: "Tablet" },
    { photo: deviceLaptop.url, key: "devices.laptop", label: "Laptop" },
    { photo: deviceDesktop.url, key: "devices.desktop", label: "Desktop" },
  ];
  return (
    <section id="devices" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("devices.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("devices.title.a")}<span className="text-gradient-gold">{t("devices.title.b")}</span></h2>
          <p className="text-muted-foreground mt-4">{t("devices.sub")}</p>
        </div>
        <div className="glass rounded-3xl p-8 md:p-12">
          <img
            src={devicesMain.url}
            alt="Premium streaming on multiple devices in a real living room"
            width={1344}
            height={768}
            loading="lazy"
            className="rounded-2xl w-full mb-10 object-cover"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {devices.map(({ photo, key, label }) => (
              <div key={key} className="flex flex-col items-center gap-2 p-4 rounded-xl glass hover:border-[color:var(--gold)]/40 transition">
                <img
                  src={photo}
                  alt={label}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-20 w-20 object-cover"
                />
                <span className="text-xs text-muted-foreground text-center">{t(key)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const t = useT();
  const { locale } = useI18n();
  const fetchPlans = useServerFn(getPublicPlans);
  const { data: plans = [] } = useQuery<PublicPlan[]>({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
    staleTime: 30_000,
  });
  const features = [1, 2, 3, 4, 5].map((i) => t(`pricing.feat.${i}`));
  return (
    <section id="pricing" className="py-28 relative">
      <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("pricing.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("pricing.title.a")}<span className="text-gradient-gold">{t("pricing.title.b")}</span></h2>
          <p className="text-muted-foreground mt-4">{t("pricing.sub")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(p => (
            <div key={p.id} id={`pricing-${p.slug}`} className={`relative glass rounded-2xl p-8 transition hover-scale scroll-mt-24 ${p.popular ? "border-[color:var(--gold)]/60 shadow-[var(--shadow-gold)]" : ""}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[image:var(--gradient-gold)] text-black text-xs font-bold px-3 py-1 rounded-full">
                  {t("pricing.popular")}
                </div>
              )}
              <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
              {p.save_label && <p className="text-xs text-[color:var(--gold)] mb-4">{p.save_label}</p>}
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-5xl font-bold text-gradient-gold">${p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period_label}</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-[color:var(--gold)] mt-0.5 shrink-0" /><span className="text-muted-foreground">{f}</span></li>
                ))}
              </ul>
              <a href={`/checkout?plan=${encodeURIComponent(p.slug)}`} className={`block text-center px-5 py-3 rounded-full font-semibold transition ${p.popular ? "btn-gold btn-gold-hover" : "glass hover:border-[color:var(--gold)]/40"}`}>{t("pricing.cta")}</a>
              <PlanShare plan={p} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanShare({ plan, locale }: { plan: PublicPlan; locale: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "https://nexora-iptv.com";
  const path = locale === "fr" ? "/fr" : locale === "de" ? "/de" : "/en";
  const shareUrl = `${base}${path}?plan=${encodeURIComponent(plan.slug)}#pricing`;
  const tpl = (key: string) =>
    t(key)
      .replace("{plan}", plan.name)
      .replace("{price}", `$${plan.price}`)
      .replace("{period}", plan.period_label ? ` ${plan.period_label}` : "");
  const message = `${tpl("share.plan.message")} ${shareUrl}`;
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: `Nexora IPTV — ${plan.name}`, text: tpl("share.plan.message"), url: shareUrl });
        return;
      } catch {}
    }
    setOpen((v) => !v);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={nativeShare}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold glass hover:border-[color:var(--gold)]/40 transition"
        aria-label={t("share.plan.title")}
      >
        <Share2 className="h-3.5 w-3.5" />
        {t("share.plan.cta")}
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <a href={`https://api.whatsapp.com/send?text=${enc(message)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <MessageCircle className="h-3 w-3" />WhatsApp
          </a>
          <a href={`https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(tpl("share.plan.message"))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <Send className="h-3 w-3" />Telegram
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(tpl("share.plan.message"))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <Facebook className="h-3 w-3" />Facebook
          </a>
          <a href={`https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(tpl("share.plan.message"))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <Twitter className="h-3 w-3" />X
          </a>
          <a href={`mailto:?subject=${enc(tpl("share.plan.emailSubject"))}&body=${enc(message)}`} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <Mail className="h-3 w-3" />Email
          </a>
          <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-[11px] glass hover:border-[color:var(--gold)]/40">
            <Link2 className="h-3 w-3" />{copied ? t("share.plan.copied") : t("share.copy")}
          </button>
        </div>
      )}
    </div>
  );
}

function HowItWorks() {
  const t = useT();
  const steps = [1, 2, 3];
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("how.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("how.title.a")}<span className="text-gradient-gold">{t("how.title.b")}</span></h2>
        </div>
        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[color:var(--gold)]/40 to-transparent" />
          {steps.map(n => (
            <div key={n} className="relative glass rounded-2xl p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center text-black font-bold text-xl mb-5">{`0${n}`}</div>
              <h3 className="text-xl font-semibold mb-2">{t(`how.${n}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`how.${n}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Downloads() {
  const t = useT();
  const apps = [
    {
      platform: "iOS",
      title: t("download.ios.app"),
      device: t("download.ios.device"),
      href: "https://apps.apple.com/fr/app/smarters-player-lite/id1628995509",
      img: downloadIos,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.8-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.84-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
    },
    {
      platform: "Android",
      title: t("download.android.app"),
      device: t("download.android.device"),
      href: "https://iptv-smarters-pro.fr.uptodown.com/android#",
      img: downloadAndroid,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.44-4.19l1.13-1.97c.11-.18.05-.41-.13-.52-.18-.11-.41-.05-.52.13l-1.15 1.99c-1.45-.64-3.07-.99-4.79-.99s-3.34.35-4.79.99L6.44 2.42c-.11-.18-.34-.24-.52-.13-.18.11-.24.34-.13.52l1.13 1.97C4.14 6.16 2 9.24 2 12.76h20c0-3.52-2.14-6.6-5.44-7.95zM10 5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5S10 6.33 10 5.5z" />
        </svg>
      ),
    },
    {
      platform: "Windows",
      title: t("download.windows.app"),
      device: t("download.windows.device"),
      href: "https://iptv-smarters-pro.fr.uptodown.com/windows#",
      img: downloadWindows,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
        </svg>
      ),
    },
  ];
  return (
    <section id="downloads" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("download.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("download.title.a")}<span className="text-gradient-gold">{t("download.title.b")}</span></h2>
          <p className="text-muted-foreground mt-4">{t("download.sub")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {apps.map((app) => (
            <a
              key={app.platform}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative glass rounded-3xl p-6 transition hover-scale overflow-hidden"
              style={{ animation: "glow-pulse 3s ease-in-out infinite" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
              <div className="relative z-0 mb-6 -mx-6 -mt-6 overflow-hidden rounded-t-3xl">
                <img
                  src={app.img}
                  alt={app.title}
                  width={768}
                  height={768}
                  loading="lazy"
                  className="w-full h-48 object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="relative z-20 flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-gold)] grid place-items-center text-black">
                  {app.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{app.platform}</h3>
                  <p className="text-xs text-muted-foreground">{app.device}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{app.title}</p>
              <div className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                {t("download.btn")}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = useT();
  const testimonials = [
    {
      name: "Daniel K.",
      role: "Lagos, Nigeria",
      photo: danielPhoto.url,
      text: "Honnêtement je m'attendais à galérer, mais j'ai reçu mes codes en 2 min sur WhatsApp. Je regarde Premier League et Canal+ Sport sur mon Firestick, zéro coupure même le week-end.",
      verified: true,
      since: "2024",
    },
    {
      name: "Amélie R.",
      role: "Paris, France",
      photo: ameliePhoto.url,
      text: "Je cherchais une alternative propre à mon abo TV. beIN, Netflix VF, Disney+ — tout passe nickel sur l'Apple TV. Le support répond en moins de 5 min, ça change tout.",
      verified: true,
      since: "2026",
    },
    {
      name: "Carlos M.",
      role: "Madrid, Spain",
      photo: carlosPhoto.url,
      text: "He probado 4 proveedores antes, siempre el mismo problema los días de LaLiga. Con Nexora ni un lag en 3 meses, y las películas están en VOSE. Por fin.",
      verified: true,
      since: "2024",
    },
    {
      name: "Fatou D.",
      role: "Dakar, Senegal",
      photo: fatouPhoto.url,
      text: "J'ai payé avec Orange Money un dimanche soir, actif en 3 min. Mes enfants ont leurs dessins animés, moi Nollywood et les séries — pour le prix, franchement rien à dire.",
      verified: true,
      since: "2025",
    },
  ];
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("test.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t("test.title.a")}<span className="text-gradient-gold">{t("test.title.b")}</span>{t("test.title.c")}</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-[color:var(--gold)] text-[color:var(--gold)]" />)}
            </div>
            <span className="text-muted-foreground">{t("test.rating")}</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map(tt => (
            <div key={tt.name} className="glass rounded-2xl p-6 flex flex-col relative">
              {tt.verified && (
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--gold)]">
                  <BadgeCheck className="h-3 w-3" />
                  Avis vérifié
                </div>
              )}
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[color:var(--gold)] text-[color:var(--gold)]" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{tt.text}"</p>
              <div className="mt-auto flex items-center gap-3">
                <img
                  src={tt.photo}
                  alt={tt.name}
                  loading="lazy"
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-[color:var(--gold)]/40"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{tt.name}</p>
                  <p className="text-xs text-muted-foreground">{tt.role}</p>
                  {tt.since && (
                    <span className="mt-1 inline-flex items-center rounded-full border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Client depuis {tt.since}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const t = useT();
  const faqs = [1, 2, 3, 4, 5];
  return (
    <section id="faq" className="py-28 relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("faq.kicker")}</p>
          <h2 className="text-4xl md:text-5xl font-bold">{t("faq.title.a")}<span className="text-gradient-gold">{t("faq.title.b")}</span></h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass rounded-xl px-6 border-0">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">{t(`faq.${i}.q`)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">{t(`faq.${i}.a`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Payments() {
  const t = useT();
  const methods = ["VISA", "Mastercard", "Orange Money", "MTN MoMo", "Crypto"];
  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="glass rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)] mb-2">{t("pay.kicker")}</p>
            <h3 className="text-2xl font-semibold">{t("pay.title")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("pay.sub")}</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {methods.map(m => (
              <div key={m} className="px-4 py-2 rounded-lg bg-black/40 border border-[color:var(--gold)]/20 text-xs font-semibold tracking-wide">{m}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Support() {
  const t = useT();
  return (
    <section id="support" className="py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative glass rounded-3xl p-10 md:p-16 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 bg-[color:var(--gold)]/20 blur-3xl rounded-full" />
          <div className="relative text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("support.kicker")}</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t("support.title.a")}<span className="text-gradient-gold">{t("support.title.b")}</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10">{t("support.sub")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="btn-gold btn-gold-hover px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2"><MessageCircle className="h-5 w-5" />WhatsApp</a>
              <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="glass px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"><Send className="h-5 w-5" />Telegram</a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="glass px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"><Mail className="h-5 w-5" />Email</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useT();
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: t("footer.company"), links: [t("footer.about"), t("footer.blog"), t("footer.careers"), t("footer.contact")] },
    { title: t("footer.support"), links: [t("footer.help"), "WhatsApp", "Telegram", "Email"] },
    { title: t("footer.legal"),   links: [t("footer.terms"), t("footer.privacy"), t("footer.refund"), t("footer.cookies")] },
  ].map((c) => ({ title: c.title, links: c.links.map((l) => ({ label: l, href: "#" })) }));
  // Sprint 3 · Bloc C — surface the real compliance pages.
  const legalCol = cols.find((c) => c.title === t("footer.legal"));
  if (legalCol) {
    legalCol.links = [
      { label: t("footer.terms"),   href: "/legal/terms" },
      { label: "CGV",               href: "/legal/sales" },
      { label: t("footer.privacy"), href: "/legal/privacy" },
      { label: t("footer.refund"),  href: "/legal/refund" },
      { label: "Mentions légales",  href: "/legal/notice" },
    ];
  }
  // Wire real contact channels (WhatsApp Business, Telegram bot, email).
  const supportCol = cols.find((c) => c.title === t("footer.support"));
  if (supportCol) {
    supportCol.links = [
      { label: t("footer.help"), href: "#support" },
      { label: "WhatsApp",       href: buildWhatsAppLink() },
      { label: "Telegram",       href: TELEGRAM_BOT_URL },
      { label: "Email",          href: `mailto:${SUPPORT_EMAIL}` },
    ];
  }
  const companyCol = cols.find((c) => c.title === t("footer.company"));
  if (companyCol) {
    companyCol.links = [
      { label: t("footer.about"),   href: "#features" },
      { label: t("footer.blog"),    href: "/blog" },
      { label: t("footer.careers"), href: `mailto:${SUPPORT_EMAIL}?subject=Careers` },
      { label: t("footer.contact"), href: buildWhatsAppLink() },
    ];
  }
  return (
    <footer className="border-t border-[color:var(--gold)]/10 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </div>
          <p className="text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <h3 className="font-semibold mb-4 text-sm tracking-wide">{c.title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.links.map(l => <li key={l.label}><a href={l.href} className="hover:text-[color:var(--gold)] transition">{l.label}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-[color:var(--gold)]/10 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} Nexora IPTV. {t("footer.rights")}</span>
        <div className="flex items-center gap-3">
          <Link to="/admin/login" className="text-muted-foreground hover:text-foreground transition">Admin</Link>
          <span>nexora-iptv.com</span>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
       className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full btn-gold btn-gold-hover grid place-items-center shadow-[var(--shadow-gold)]">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

function LatestPosts() {
  const list = useServerFn(publicListPosts);
  const { data } = useQuery({
    queryKey: ["home", "latest-posts"],
    queryFn: () => list({ data: { page: 1, page_size: 3 } }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const rows = (data?.rows ?? []) as any[];
  if (rows.length === 0) return null;
  return (
    <section id="latest-posts" className="py-20 border-t border-[color:var(--gold)]/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Derniers articles du blog</h2>
            <p className="mt-2 text-muted-foreground">Guides, tutoriels et actualités IPTV.</p>
          </div>
          <Link to="/blog" className="text-sm font-semibold text-[color:var(--gold)] hover:underline">
            Voir tous les articles →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </div>
    </section>
  );
}

function Share() {
  const t = useT();
  const { locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const base = "https://nexora-iptv.com";
  const path = locale === "en" ? "/en/" : locale === "de" ? "/de/" : locale === "fr" ? "/fr/" : "/";
  const shareUrl = `${base}${path}#pricing`;
  const message = `${t("share.message")} ${shareUrl}`;
  const enc = encodeURIComponent;
  const links = [
    {
      key: "whatsapp",
      label: t("share.whatsapp"),
      href: `https://api.whatsapp.com/send?text=${enc(message)}`,
      Icon: MessageCircle,
    },
    {
      key: "telegram",
      label: t("share.telegram"),
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(t("share.message"))}`,
      Icon: Send,
    },
    {
      key: "facebook",
      label: t("share.facebook"),
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(t("share.message"))}`,
      Icon: Facebook,
    },
    {
      key: "x",
      label: t("share.x"),
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(t("share.message"))}`,
      Icon: Twitter,
    },
    {
      key: "email",
      label: t("share.email"),
      href: `mailto:?subject=${enc(t("share.emailSubject"))}&body=${enc(message)}`,
      Icon: Mail,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Nexora IPTV",
          text: t("share.message"),
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copy();
    }
  };

  return (
    <section id="share" className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="glass rounded-3xl p-8 md:p-12">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("share.kicker")}</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              {t("share.title.a")}<span className="text-gradient-gold">{t("share.title.b")}</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">{t("share.sub")}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {links.map(({ key, label, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="glass px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"
              >
                <Icon className="h-4 w-4 text-[color:var(--gold)]" />
                {label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="glass px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"
            >
              <Link2 className="h-4 w-4 text-[color:var(--gold)]" />
              {copied ? t("share.copied") : t("share.copy")}
            </button>
            <button
              type="button"
              onClick={nativeShare}
              className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              {t("share.native")}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground break-all">
            {shareUrl}
          </p>
        </div>
      </div>
    </section>
  );
}