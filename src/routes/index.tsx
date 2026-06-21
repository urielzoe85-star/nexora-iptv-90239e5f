import { createFileRoute } from "@tanstack/react-router";
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

const features = [
  { icon: Tv, title: "Massive Channel Library", desc: "Access thousands of live channels from around the world in crystal-clear quality." },
  { icon: Film, title: "Movies & Series", desc: "A constantly updated catalog of on-demand films and binge-worthy series." },
  { icon: Zap, title: "Instant Delivery", desc: "Receive your credentials within minutes after secure checkout." },
  { icon: Globe2, title: "Worldwide Access", desc: "Stream from anywhere. No regional restrictions, no compromises." },
  { icon: ShieldCheck, title: "Secure Payments", desc: "Encrypted, PCI-compliant checkout with multiple trusted methods." },
  { icon: Headphones, title: "Dedicated Support", desc: "Real humans, available 24/7 on WhatsApp, Telegram and email." },
];

const devices = [
  { icon: Tv2, name: "Smart TV" },
  { icon: Tv, name: "Android TV" },
  { icon: Tv, name: "Fire TV Stick" },
  { icon: Smartphone, name: "Smartphone" },
  { icon: Tablet, name: "Tablet" },
  { icon: Laptop, name: "Laptop" },
  { icon: Monitor, name: "Desktop" },
];

const plans = [
  { name: "1 Month", price: 12, period: "/month", badge: null },
  { name: "3 Months", price: 30, period: "/quarter", save: "Save 17%", badge: null },
  { name: "6 Months", price: 55, period: "/6 months", save: "Save 24%", badge: null },
  { name: "12 Months", price: 95, period: "/year", save: "Save 34%", badge: "Most Popular" },
];

const planFeatures = [
  "Full Access to all channels",
  "HD / FHD / 4K quality",
  "VOD — Movies & Series",
  "Multi-device support",
  "Premium 24/7 support",
];

const steps = [
  { n: "01", title: "Choose Your Plan", desc: "Pick the duration that fits you best — flexible and transparent pricing." },
  { n: "02", title: "Complete Payment", desc: "Pay securely with card, mobile money or crypto. PCI-compliant checkout." },
  { n: "03", title: "Receive Access Instantly", desc: "Get your credentials in minutes and start streaming on any device." },
];

const testimonials = [
  { name: "Daniel K.", role: "Lagos, Nigeria", text: "Activation was literally instant. The 4K stream is butter smooth on my Samsung TV." },
  { name: "Amélie R.", role: "Paris, France", text: "Massive sports & movies catalog. Support replied in under 2 minutes on WhatsApp." },
  { name: "Carlos M.", role: "Madrid, Spain", text: "I tried four IPTV providers — Nexora is the only one that just works, every single day." },
  { name: "Fatou D.", role: "Dakar, Senegal", text: "Paid with Orange Money, got access in 3 minutes. Quality is unreal for the price." },
];

const faqs = [
  { q: "How fast is activation?", a: "Most subscriptions are activated within 5–10 minutes after payment is confirmed. You receive credentials by email and on WhatsApp." },
  { q: "Can I use multiple devices?", a: "Yes. Every plan includes multi-device support so you can stream on your TV, phone, tablet and laptop." },
  { q: "Do I need special equipment?", a: "No. Any modern Smart TV, Android/iOS device, Fire Stick, or computer with a stable internet connection works perfectly." },
  { q: "Which devices are supported?", a: "Smart TVs (Samsung, LG, Sony), Android TV, Fire TV Stick, Apple TV, smartphones, tablets, MAG boxes, and Windows/Mac." },
  { q: "How do I contact support?", a: "We're available 24/7 on WhatsApp, Telegram and email. Average response time is under 5 minutes." },
];

function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
          <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#devices" className="hover:text-foreground transition">Devices</a>
          <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          <a href="#support" className="hover:text-foreground transition">Support</a>
        </nav>
        <a href="#pricing" className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-sm font-semibold">Get Started</a>
        <button className="md:hidden text-foreground" aria-label="Menu"><Menu className="h-6 w-6" /></button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-screen flex items-center pt-24 overflow-hidden">
      <img src={heroBg} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center w-full">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <span className="h-2 w-2 rounded-full bg-[color:var(--gold)] animate-pulse" />
            Trusted by 25,000+ subscribers worldwide
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
            Access Thousands of <span className="text-gradient-gold">Channels</span>, Movies & Series Instantly
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            Experience premium entertainment on Smart TVs, smartphones, tablets and PCs. One subscription. Unlimited streaming.
          </p>
          <div className="flex flex-wrap gap-4 mb-10">
            <a href="#pricing" className="btn-gold btn-gold-hover px-7 py-3.5 rounded-full font-semibold">Start Now</a>
            <a href="#pricing" className="glass px-7 py-3.5 rounded-full font-semibold hover:border-[color:var(--gold)]/40 transition">View Plans</a>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {["Instant Activation", "24/7 Support", "HD / FHD / 4K Quality", "Multi-Device Access"].map(t => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--gold)]" />{t}</li>
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
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Why Nexora</p>
          <h2 className="text-4xl md:text-5xl font-bold">Why Choose <span className="text-gradient-gold">Nexora IPTV</span></h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group glass rounded-2xl p-8 hover:border-[color:var(--gold)]/40 transition hover-scale">
              <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-gold)] grid place-items-center text-black mb-5 group-hover:scale-110 transition">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Devices() {
  return (
    <section id="devices" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Compatibility</p>
          <h2 className="text-4xl md:text-5xl font-bold">Watch <span className="text-gradient-gold">Anywhere</span></h2>
          <p className="text-muted-foreground mt-4">One account. Every screen. Pick up where you left off across all your devices.</p>
        </div>
        <div className="glass rounded-3xl p-8 md:p-12">
          <img src={devicesImg} alt="Premium streaming on multiple devices" width={1600} height={1024} loading="lazy" className="rounded-2xl w-full mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {devices.map(({ icon: Icon, name }) => (
              <div key={name} className="flex flex-col items-center gap-2 p-4 rounded-xl glass hover:border-[color:var(--gold)]/40 transition">
                <Icon className="h-7 w-7 text-[color:var(--gold)]" />
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-28 relative">
      <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold">Choose Your <span className="text-gradient-gold">Plan</span></h2>
          <p className="text-muted-foreground mt-4">Transparent pricing. Cancel anytime. No hidden fees.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(p => (
            <div key={p.name} className={`relative glass rounded-2xl p-8 transition hover-scale ${p.badge ? "border-[color:var(--gold)]/60 shadow-[var(--shadow-gold)]" : ""}`}>
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[image:var(--gradient-gold)] text-black text-xs font-bold px-3 py-1 rounded-full">
                  {p.badge}
                </div>
              )}
              <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
              {p.save && <p className="text-xs text-[color:var(--gold)] mb-4">{p.save}</p>}
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-5xl font-bold text-gradient-gold">${p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {planFeatures.map(f => (
                  <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-[color:var(--gold)] mt-0.5 shrink-0" /><span className="text-muted-foreground">{f}</span></li>
                ))}
              </ul>
              <a href={`/checkout?plan=${encodeURIComponent(p.name)}`} className={`block text-center px-5 py-3 rounded-full font-semibold transition ${p.badge ? "btn-gold btn-gold-hover" : "glass hover:border-[color:var(--gold)]/40"}`}>Get Started</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">How It Works</p>
          <h2 className="text-4xl md:text-5xl font-bold">Streaming in <span className="text-gradient-gold">3 Steps</span></h2>
        </div>
        <div className="relative grid md:grid-cols-3 gap-8">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[color:var(--gold)]/40 to-transparent" />
          {steps.map(s => (
            <div key={s.n} className="relative glass rounded-2xl p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center text-black font-bold text-xl mb-5">{s.n}</div>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Loved Worldwide</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by <span className="text-gradient-gold">25,000+</span> Subscribers</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-[color:var(--gold)] text-[color:var(--gold)]" />)}
            </div>
            <span className="text-muted-foreground">4.9/5 average rating</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="glass rounded-2xl p-6 flex flex-col">
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[color:var(--gold)] text-[color:var(--gold)]" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.text}"</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center text-black font-bold">{t.name[0]}</div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
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
  return (
    <section id="faq" className="py-28 relative">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">FAQ</p>
          <h2 className="text-4xl md:text-5xl font-bold">Frequently Asked <span className="text-gradient-gold">Questions</span></h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="glass rounded-xl px-6 border-0">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Payments() {
  const methods = ["VISA", "Mastercard", "Orange Money", "MTN MoMo", "Crypto"];
  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="glass rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)] mb-2">Secure Payments</p>
            <h3 className="text-2xl font-semibold">Pay your way — safely</h3>
            <p className="text-sm text-muted-foreground mt-1">256-bit SSL · PCI-DSS compliant · 3D Secure</p>
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
  return (
    <section id="support" className="py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative glass rounded-3xl p-10 md:p-16 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 bg-[color:var(--gold)]/20 blur-3xl rounded-full" />
          <div className="relative text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Support</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Need <span className="text-gradient-gold">Assistance?</span></h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10">Our team is online 24/7. Reach us on the channel you prefer — we usually reply in under 5 minutes.</p>
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
  const cols = [
    { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
    { title: "Support", links: ["Help Center", "WhatsApp", "Telegram", "Email"] },
    { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Refund Policy", "Cookies"] },
  ];
  return (
    <footer className="border-t border-[color:var(--gold)]/10 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </div>
          <p className="text-sm text-muted-foreground">Unlimited entertainment. One subscription.</p>
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
        <span>© {new Date().getFullYear()} Nexora IPTV. All Rights Reserved.</span>
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

function NexoraLanding() {
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
