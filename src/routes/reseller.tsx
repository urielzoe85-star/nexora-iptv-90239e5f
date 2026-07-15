import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Users, TrendingUp, Wallet, Settings2, Headphones, Rocket, ShieldCheck } from "lucide-react";

const BENEFITS = [
  { icon: <Wallet className="h-5 w-5" />, title: "Wholesale pricing", desc: "Buy IPTV credits in bulk and earn margins of 40–70% on every subscription you resell." },
  { icon: <Settings2 className="h-5 w-5" />, title: "Reseller panel", desc: "Create, renew, suspend and manage client lines from a dedicated dashboard — M3U + Xtream Codes." },
  { icon: <Rocket className="h-5 w-5" />, title: "Instant activation", desc: "Generate new IPTV accounts in seconds. No waiting, no manual tickets, no downtime." },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Stable premium servers", desc: "20,000+ channels, 80,000+ VOD in HD/FHD/4K on redundant servers with automatic failover." },
  { icon: <Headphones className="h-5 w-5" />, title: "Priority B2B support", desc: "Dedicated 24/7 multilingual support channel for resellers — English, French, German, Spanish, Italian." },
  { icon: <TrendingUp className="h-5 w-5" />, title: "Grow your IPTV business", desc: "White-label ready, marketing assets provided, no minimum monthly commitment after your starter pack." },
];

const CREDIT_PACKS = [
  { name: "Starter", credits: 10, price: "€90", perLine: "€9.00", best: "Test the market, resell to friends & family." },
  { name: "Growth", credits: 25, price: "€200", perLine: "€8.00", best: "Small resellers building a first client base.", highlight: true },
  { name: "Business", credits: 50, price: "€350", perLine: "€7.00", best: "Active resellers with recurring customers." },
  { name: "Pro", credits: 100, price: "€600", perLine: "€6.00", best: "Established shops and IPTV agencies." },
  { name: "Elite", credits: 250, price: "€1,250", perLine: "€5.00", best: "Wholesalers and multi-country operators." },
];

const STEPS = [
  { n: "1", title: "Apply for a reseller account", desc: "Contact us via WhatsApp or email with your business details. Approval usually takes under 24 hours." },
  { n: "2", title: "Buy your first credit pack", desc: "Pick a pack from 10 to 250 credits. One credit = one 1-month IPTV subscription (or split into shorter trials)." },
  { n: "3", title: "Access the reseller panel", desc: "Log in to your IPTV reseller panel, create client lines, set expiry, generate M3U or Xtream Codes credentials." },
  { n: "4", title: "Resell at your own price", desc: "Set your retail price, deliver credentials to your clients, keep 100% of the margin. Renew credits anytime." },
];

const FAQ = [
  {
    q: "What is an IPTV reseller program?",
    a: "An IPTV reseller program lets you buy IPTV subscriptions at wholesale price from a provider like Nexora IPTV, then resell them to your own clients at retail price. You keep the margin and manage your customers from a dedicated reseller panel.",
  },
  {
    q: "How does the Nexora IPTV reseller panel work?",
    a: "After approval you receive access to a web-based reseller panel where you can create new IPTV lines, renew or suspend existing ones, generate M3U links or Xtream Codes credentials, set trial durations and monitor active clients — all in real time.",
  },
  {
    q: "How much does it cost to become an IPTV reseller?",
    a: "Nexora IPTV reseller credits start at €90 for 10 credits (€9 per line) and scale down to €5 per line on the Elite 250-credit pack. There is no monthly fee — you only pay for the credits you use, and unused credits never expire.",
  },
  {
    q: "How much can I earn as an IPTV reseller?",
    a: "Retail prices for a 12-month IPTV subscription typically range from €60 to €120. With a wholesale cost of €5–€9 per credit (1 month), most active resellers earn a 40–70% margin per client after marketing costs.",
  },
  {
    q: "Do I need technical skills to start?",
    a: "No. The reseller panel is designed for non-technical users — creating a line takes under 30 seconds. Our team also provides onboarding, ready-made marketing assets and 24/7 priority support to help you launch quickly.",
  },
  {
    q: "Can I white-label the service under my own brand?",
    a: "Yes. You deliver the credentials under your own brand, price and communication channels. Nexora IPTV operates as your silent wholesale supplier — your clients only see you.",
  },
];

export const Route = createFileRoute("/reseller")({
  head: () => ({
    meta: [
      { title: "IPTV Reseller Program — Nexora IPTV Reseller Panel & Credits" },
      { name: "description", content: "Join the Nexora IPTV reseller program. Wholesale credits from €5/line, dedicated reseller panel, instant activation, 20,000+ channels and 4K. Start your IPTV business today." },
      { property: "og:title", content: "IPTV Reseller Program — Nexora IPTV" },
      { property: "og:description", content: "Wholesale IPTV credits, dedicated reseller panel, instant activation and 24/7 B2B support. Launch your own IPTV business with Nexora." },
      { property: "og:url", content: "https://nexora-iptv.com/reseller" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IPTV Reseller Program — Nexora IPTV" },
      { name: "twitter:description", content: "Become an IPTV reseller with Nexora: wholesale credits, reseller panel, instant activation, 4K catalog and 24/7 support." },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/reseller" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Nexora IPTV Reseller Program",
          serviceType: "IPTV reseller program",
          provider: { "@type": "Organization", name: "Nexora IPTV", url: "https://nexora-iptv.com" },
          areaServed: "Worldwide",
          description: "Wholesale IPTV credits and a dedicated reseller panel to launch and grow your own IPTV business.",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: "90",
            highPrice: "1250",
            offerCount: 5,
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://nexora-iptv.com/" },
            { "@type": "ListItem", position: 2, name: "IPTV Reseller Program", item: "https://nexora-iptv.com/reseller" },
          ],
        }),
      },
    ],
  }),
  component: ResellerPage,
});

function ResellerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Home</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <section className="max-w-4xl mx-auto px-6 text-center mb-16">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Nexora IPTV · B2B Program</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            IPTV Reseller Program — Launch Your Own IPTV Business
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Become a <strong>Nexora IPTV reseller</strong> and get wholesale access to 20,000+ live channels,
            80,000+ movies and series in HD/FHD/4K, a dedicated <strong>IPTV reseller panel</strong>,
            instant activation and priority 24/7 B2B support. No monthly fee — pay only for the credits you use,
            resell at your own price and keep the full margin.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/message" className="px-6 py-3 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold">Apply as reseller</a>
            <Link to="/" className="px-6 py-3 rounded-lg border border-white/15 hover:bg-white/5 transition">Back to home</Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Why join the Nexora IPTV reseller program</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{b.icon}<span className="font-semibold text-foreground">{b.title}</span></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-center">IPTV reseller credit packs &amp; pricing</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            One credit = one 1-month IPTV subscription. Credits never expire and can be split into shorter trials from the reseller panel.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr>
                  <th className="p-3 font-semibold">Pack</th>
                  <th className="p-3 font-semibold">Credits</th>
                  <th className="p-3 font-semibold">Total price</th>
                  <th className="p-3 font-semibold">Per line</th>
                  <th className="p-3 font-semibold">Best for</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_PACKS.map((p) => (
                  <tr key={p.name} className={p.highlight ? "bg-[color:var(--gold)]/5" : ""}>
                    <td className="p-3 font-semibold text-foreground">{p.name}{p.highlight && <span className="ml-2 text-[color:var(--gold)]">★</span>}</td>
                    <td className="p-3 text-muted-foreground">{p.credits}</td>
                    <td className="p-3 text-muted-foreground">{p.price}</td>
                    <td className="p-3 text-muted-foreground">{p.perLine}</td>
                    <td className="p-3 text-muted-foreground">{p.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">How the IPTV reseller panel works</h2>
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

        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">What you get as a Nexora IPTV reseller</h2>
          <ul className="space-y-3">
            {[
              "Wholesale IPTV credits starting at €5 per line on the Elite pack.",
              "Dedicated reseller panel: create, renew, suspend, generate M3U + Xtream Codes credentials.",
              "20,000+ live channels and 80,000+ VOD titles updated daily, in HD/FHD/4K with EPG.",
              "Instant line creation — activate a new client in under 30 seconds.",
              "Priority 24/7 B2B support with a dedicated multilingual channel.",
              "White-label ready: deliver under your own brand, keep 100% of the retail margin.",
              "Marketing assets: banners, product descriptions, comparison tables ready to publish.",
              "No monthly commitment, no expiry on unused credits, no hidden fees.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">IPTV reseller FAQ</h2>
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
            <Users className="h-8 w-8 text-[color:var(--gold)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Ready to start your IPTV reseller business?</p>
              <p className="text-sm text-muted-foreground">Apply today — approval in under 24 hours, first credits activated the same day.</p>
            </div>
            <a href="https://wa.me/message" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold whitespace-nowrap">Apply now</a>
          </div>
        </section>
      </main>
    </div>
  );
}