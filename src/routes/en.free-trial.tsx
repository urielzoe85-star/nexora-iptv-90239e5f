import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Tv, Smartphone, Zap, Clock, ShieldCheck, Gift } from "lucide-react";
import { toast } from "sonner";
import { requestFreeTrial } from "@/lib/trials.functions";

const INCLUDED = [
  { icon: <Tv className="h-5 w-5" />, title: "+20,000 live channels", desc: "Sports, movies, news, kids and international channels in HD/FHD/4K." },
  { icon: <Gift className="h-5 w-5" />, title: "Unlimited 4K VOD", desc: "80,000+ movies and series, catalog updated daily." },
  { icon: <Smartphone className="h-5 w-5" />, title: "Multi-device", desc: "Smart TV, Firestick, Android, iOS, Mac, PC, IPTV boxes." },
  { icon: <Clock className="h-5 w-5" />, title: "EPG & catch-up", desc: "7-day TV guide and catch-up on major channels." },
];

const STEPS = [
  { n: "1", title: "Fill in the form", desc: "Email + WhatsApp or Telegram. No credit card required." },
  { n: "2", title: "Receive your access in 5 min", desc: "Xtream Codes credentials + M3U link sent on your chosen channel." },
  { n: "3", title: "Watch for 24 hours", desc: "Guided setup on your device, 24/7 support if you get stuck." },
];

const FAQ = [
  { q: "Is the free IPTV trial really no-commitment?", a: "Yes. The 24-hour free trial from Nexora IPTV requires no credit card, no payment method and never converts automatically into a paid subscription. You freely decide whether to subscribe at the end of the 24 hours." },
  { q: "How long does the free trial last?", a: "The trial lasts 24 hours from the activation of your credentials. During that time you get access to the full Nexora IPTV catalog: live channels, VOD, EPG and catch-up." },
  { q: "Which devices can I test IPTV on for free?", a: "The free trial works on Samsung/LG Smart TVs, Amazon Firestick, Android TV, IPTV boxes, iOS and Android smartphones, tablets, Mac and PC via apps like IBO Player, Smarters Pro, TiviMate or M-IBO." },
  { q: "How long before I receive my trial access?", a: "Credentials are sent in under 5 minutes during business hours, on your chosen channel (WhatsApp, Telegram or email). During peak hours, allow up to 30 minutes." },
  { q: "What happens after the 24-hour trial?", a: "Your access is automatically suspended. No charge, no aggressive follow-up. If the trial convinced you, you can subscribe to a Nexora IPTV plan in a few clicks and get immediate access." },
  { q: "Can I switch directly from the trial to a paid subscription?", a: "Yes. At the end of the trial you can keep the same setup and the same credentials by choosing any Nexora IPTV plan. No need to reconfigure anything on your devices." },
];

export const Route = createFileRoute("/en/free-trial")({
  head: () => ({
    meta: [
      { title: "Free 24h IPTV Trial — No commitment | Nexora IPTV" },
      { name: "description", content: "Try the Nexora IPTV subscription free for 24 hours: +20,000 channels, 4K VOD, multi-device. No credit card, activated in 5 minutes." },
      { property: "og:title", content: "Free 24h IPTV Trial — Nexora IPTV" },
      { property: "og:description", content: "No-commitment free IPTV trial: live channels, 4K VOD and 24/7 support. Activated in 5 minutes on WhatsApp, Telegram or email." },
      { property: "og:url", content: "https://nexora-iptv.com/en/free-trial" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Free 24h IPTV Trial — Nexora IPTV" },
      { name: "twitter:description", content: "Test the Nexora IPTV subscription free for 24 hours. No credit card, no commitment." },
    ],
    links: [
      { rel: "canonical", href: "https://nexora-iptv.com/en/free-trial" },
      { rel: "alternate", hrefLang: "fr", href: "https://nexora-iptv.com/essai-gratuit" },
      { rel: "alternate", hrefLang: "en", href: "https://nexora-iptv.com/en/free-trial" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nexora-iptv.com/essai-gratuit" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Nexora 24h Free IPTV Trial",
          serviceType: "IPTV subscription free trial",
          provider: { "@type": "Organization", name: "Nexora IPTV", url: "https://nexora-iptv.com" },
          areaServed: "Worldwide",
          description: "Free 24-hour trial of the Nexora IPTV subscription with +20,000 channels, 4K VOD, multi-device, no credit card.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://nexora-iptv.com/en" },
            { "@type": "ListItem", position: 2, name: "Free 24h Trial", item: "https://nexora-iptv.com/en/free-trial" },
          ],
        }),
      },
    ],
  }),
  component: FreeTrialPage,
});

function FreeTrialPage() {
  const submit = useServerFn(requestFreeTrial);
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const m = useMutation({
    mutationFn: (input: {
      email: string;
      contact: string;
      channel: "whatsapp" | "telegram" | "email";
      device: string;
      country: string;
      website: string;
    }) => submit({ data: input }),
    onSuccess: () => {
      setSent(true);
      toast.success("Request received! Your access is on its way in a few minutes.");
    },
    onError: (e) => toast.error((e as Error).message || "Something went wrong."),
  });

  function validate(f: FormData) {
    const next: Record<string, string> = {};
    const email = String(f.get("email") ?? "").trim();
    const contact = String(f.get("contact") ?? "").trim();
    const channel = String(f.get("channel") ?? "whatsapp") as "whatsapp" | "telegram" | "email";
    const country = String(f.get("country") ?? "").trim();

    if (!email) next.email = "Email is required.";
    if (channel !== "email" && !contact) {
      next.contact = "Phone number is required for WhatsApp/Telegram.";
    }
    if (!country) next.country = "Country is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!validate(f)) return;
    m.mutate({
      email: String(f.get("email") ?? ""),
      contact: String(f.get("contact") ?? "").trim(),
      channel: (String(f.get("channel") ?? "whatsapp") as "whatsapp" | "telegram" | "email"),
      device: String(f.get("device") ?? "").trim(),
      country: String(f.get("country") ?? "").trim(),
      website: String(f.get("website") ?? ""),
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/en" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/en" className="text-sm text-muted-foreground hover:text-foreground transition">← Home</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <section className="max-w-4xl mx-auto px-6 text-center mb-14">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Nexora IPTV · Free trial</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Free 24h IPTV Trial — Test before you subscribe
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Activate a <strong>free 24-hour IPTV trial</strong> on the Nexora subscription: +20,000 live channels,
            80,000+ movies and series in 4K, TV guide, catch-up and 24/7 support. <strong>No credit card</strong>,
            no commitment, access delivered in under 5 minutes on WhatsApp, Telegram or email.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5"><ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> No card</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10"><Zap className="h-4 w-4 text-[color:var(--gold)]" /> Activated in 5 min</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10"><Clock className="h-4 w-4 text-[color:var(--gold)]" /> 24h full access</span>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Why test Nexora IPTV for free</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INCLUDED.map((b) => (
              <div key={b.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{b.icon}<span className="font-semibold text-foreground">{b.title}</span></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 text-center mt-4">
            Trial limited to 1 simultaneous device in FHD. 4K and multi-device access are available once subscribed.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Activate your IPTV trial in 3 steps</h2>
          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">{s.n}</div>
                <div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="form" className="max-w-2xl mx-auto px-6 mb-20">
          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-2">Request my free trial</h2>
            <p className="text-sm text-muted-foreground mb-6">Your IPTV credentials arrive in under 5 minutes on the channel you choose.</p>
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-[color:var(--gold)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Request received ✅</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Our team is sending your trial access in a few minutes.
                  Please check your WhatsApp / Telegram / email spam folder.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => navigate({ to: "/en" })} className="px-5 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition text-sm">Back to home</button>
                  <Link to="/blog" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold text-sm">Read our IPTV guides</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required maxLength={255} placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="channel">Preferred channel *</label>
                    <select id="channel" name="channel" required defaultValue="whatsapp" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                      <option value="email">Email only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="contact">WhatsApp / Telegram number</label>
                    <input id="contact" name="contact" type="text" maxLength={60} placeholder="+1 555 123 4567" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="device">Test device</label>
                    <select id="device" name="device" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm">
                      <option value="">— Choose —</option>
                      <option value="Smart TV Samsung/LG">Smart TV Samsung / LG</option>
                      <option value="Amazon Firestick">Amazon Firestick</option>
                      <option value="Android TV / Box">Android TV / Box</option>
                      <option value="Smartphone Android">Android smartphone</option>
                      <option value="iPhone / iPad">iPhone / iPad</option>
                      <option value="PC / Mac">PC / Mac</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="country">Country</label>
                    <input id="country" name="country" type="text" maxLength={80} placeholder="United States" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                  </div>
                </div>
                {/* Honeypot */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <button type="submit" disabled={m.isPending} className="w-full px-6 py-3 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold disabled:opacity-60">
                  {m.isPending ? "Sending…" : "Activate my free 24h trial"}
                </button>
                <p className="text-[11px] text-muted-foreground/70 text-center">
                  No credit card required. Your data is only used to send your trial credentials.
                </p>
              </form>
            )}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Free trial FAQ</h2>
          <div className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6">
          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Gift className="h-8 w-8 text-[color:var(--gold)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Are you an IPTV reseller?</p>
              <p className="text-sm text-muted-foreground">Discover our <Link to="/en/reseller" className="underline hover:text-foreground">IPTV reseller program</Link> with wholesale credits and a dedicated panel.</p>
            </div>
            <Link to="/en" className="px-5 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition text-sm whitespace-nowrap">See plans</Link>
          </div>
        </section>
      </main>
    </div>
  );
}