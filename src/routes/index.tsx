import { createFileRoute, Link } from "@tanstack/react-router";
import heroBg from "@/assets/hero-bg.jpg";
import devicesImg from "@/assets/devices.jpg";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tv, Film, Zap, Globe2, ShieldCheck, Headphones,
  Check, Star, MessageCircle, Send, Mail, Menu,
  Smartphone, Tablet, Laptop, Monitor, Tv2,
} from "lucide-react";
import { useT } from "@/i18n/context";
import { LanguageSwitcher } from "@/i18n/context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora IPTV — Unlimited Entertainment. One Subscription." },
      { name: "description", content: "Premium IPTV with thousands of channels, movies & series in HD/FHD/4K. Instant activation, multi-device, 24/7 support." },
      { property: "og:title", content: "Nexora IPTV — Premium Streaming" },
      { property: "og:description", content: "Thousands of live channels & VOD. Instant access. Multi-device." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: NexoraLanding,
});

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
        <Testimonials />
        <FAQ />
        <Payments />
        <Support />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function Nav() {
  const t = useT();
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
          <a href="#faq" className="hover:text-foreground transition">{t("nav.faq")}</a>
          <a href="#support" className="hover:text-foreground transition">{t("nav.support")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a href="#pricing" className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-sm font-semibold hidden sm:inline-block">{t("nav.getStarted")}</a>
          <button className="md:hidden text-foreground" aria-label={t("nav.menu")}><Menu className="h-6 w-6" /></button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const t = useT();
  const points = [t("hero.point.1"), t("hero.point.2"), t("hero.point.3"), t("hero.point.4")];
  return (
    <section id="top" className="relative min-h-screen flex items-center pt-24 overflow-hidden">
      <img src={heroBg} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-50" />
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
          <img src={devicesImg} alt="Streaming on Smart TV, phone, tablet and laptop" width={1600} height={1024} className="relative rounded-2xl glass p-3" loading="eager" />
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
    { icon: Tv2, key: "devices.smartTv" },
    { icon: Tv, key: "devices.androidTv" },
    { icon: Tv, key: "devices.fireTv" },
    { icon: Smartphone, key: "devices.smartphone" },
    { icon: Tablet, key: "devices.tablet" },
    { icon: Laptop, key: "devices.laptop" },
    { icon: Monitor, key: "devices.desktop" },
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
          <img src={devicesImg} alt="Premium streaming on multiple devices" width={1600} height={1024} loading="lazy" className="rounded-2xl w-full mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {devices.map(({ icon: Icon, key }) => (
              <div key={key} className="flex flex-col items-center gap-2 p-4 rounded-xl glass hover:border-[color:var(--gold)]/40 transition">
                <Icon className="h-7 w-7 text-[color:var(--gold)]" />
                <span className="text-xs text-muted-foreground">{t(key)}</span>
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
  const plans = [
    { name: t("pricing.month"),    price: 12, period: t("pricing.per.month"),    save: null,                 popular: false, slug: "1m" },
    { name: t("pricing.3months"),  price: 30, period: t("pricing.per.quarter"),  save: t("pricing.save17"),  popular: false, slug: "3m" },
    { name: t("pricing.6months"),  price: 55, period: t("pricing.per.6"),        save: t("pricing.save24"),  popular: false, slug: "6m" },
    { name: t("pricing.12months"), price: 95, period: t("pricing.per.year"),     save: t("pricing.save34"),  popular: true,  slug: "12m" },
  ];
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
            <div key={p.slug} className={`relative glass rounded-2xl p-8 transition hover-scale ${p.popular ? "border-[color:var(--gold)]/60 shadow-[var(--shadow-gold)]" : ""}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[image:var(--gradient-gold)] text-black text-xs font-bold px-3 py-1 rounded-full">
                  {t("pricing.popular")}
                </div>
              )}
              <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
              {p.save && <p className="text-xs text-[color:var(--gold)] mb-4">{p.save}</p>}
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-5xl font-bold text-gradient-gold">${p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-[color:var(--gold)] mt-0.5 shrink-0" /><span className="text-muted-foreground">{f}</span></li>
                ))}
              </ul>
              <a href={`/checkout?plan=${encodeURIComponent(p.slug)}`} className={`block text-center px-5 py-3 rounded-full font-semibold transition ${p.popular ? "btn-gold btn-gold-hover" : "glass hover:border-[color:var(--gold)]/40"}`}>{t("pricing.cta")}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function Testimonials() {
  const t = useT();
  const testimonials = [
    { name: "Daniel K.", role: "Lagos, Nigeria", text: "Activation was literally instant. The 4K stream is butter smooth on my Samsung TV." },
    { name: "Amélie R.", role: "Paris, France", text: "Massive sports & movies catalog. Support replied in under 2 minutes on WhatsApp." },
    { name: "Carlos M.", role: "Madrid, Spain", text: "I tried four IPTV providers — Nexora is the only one that just works, every single day." },
    { name: "Fatou D.", role: "Dakar, Senegal", text: "Paid with Orange Money, got access in 3 minutes. Quality is unreal for the price." },
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
            <div key={tt.name} className="glass rounded-2xl p-6 flex flex-col">
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[color:var(--gold)] text-[color:var(--gold)]" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{tt.text}"</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center text-black font-bold">{tt.name[0]}</div>
                <div>
                  <p className="text-sm font-semibold">{tt.name}</p>
                  <p className="text-xs text-muted-foreground">{tt.role}</p>
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
              <a href="https://wa.me/" className="btn-gold btn-gold-hover px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2"><MessageCircle className="h-5 w-5" />WhatsApp</a>
              <a href="https://t.me/" className="glass px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"><Send className="h-5 w-5" />Telegram</a>
              <a href="mailto:support@nexora-iptv.com" className="glass px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"><Mail className="h-5 w-5" />Email</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const t = useT();
  const cols = [
    { title: t("footer.company"), links: [t("footer.about"), t("footer.blog"), t("footer.careers"), t("footer.contact")] },
    { title: t("footer.support"), links: [t("footer.help"), "WhatsApp", "Telegram", "Email"] },
    { title: t("footer.legal"),   links: [t("footer.terms"), t("footer.privacy"), t("footer.refund"), t("footer.cookies")] },
  ];
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
            <h4 className="font-semibold mb-4 text-sm tracking-wide">{c.title}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.links.map(l => <li key={l}><a href="#" className="hover:text-[color:var(--gold)] transition">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-[color:var(--gold)]/10 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} Nexora IPTV. {t("footer.rights")}</span>
        <span>nexora-iptv.com</span>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a href="https://wa.me/" aria-label="Chat on WhatsApp"
       className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full btn-gold btn-gold-hover grid place-items-center shadow-[var(--shadow-gold)]">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}