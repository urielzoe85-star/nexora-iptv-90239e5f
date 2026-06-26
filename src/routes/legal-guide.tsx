import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Globe2, AlertTriangle, CheckCircle2, Scale, Tv } from "lucide-react";

const FAQ = [
  {
    q: "Is IPTV legal in the United States?",
    a: "Yes. IPTV — Internet Protocol Television — is a legal streaming technology in the U.S. What matters is the source: a provider that holds proper distribution rights for the channels and VOD it streams is legal, while a provider that redistributes copyrighted content without a license is not. Always pick a service that publishes clear company details, payment receipts, and customer support.",
  },
  {
    q: "Is IPTV legal in the United Kingdom and the EU?",
    a: "The IPTV technology itself is legal across the UK and EU. Both jurisdictions enforce strict copyright rules (UK Copyright, Designs and Patents Act 1988; EU Copyright Directive 2019/790). Subscribers should use providers that operate transparently and comply with local broadcasting and tax regulations.",
  },
  {
    q: "Is IPTV legal in Canada and Australia?",
    a: "Yes, with the same condition: the service must distribute content it is authorized to stream. Canadian (Copyright Act) and Australian (Copyright Act 1968) law target unlicensed redistribution, not the underlying IPTV protocol.",
  },
  {
    q: "How can I tell if an IPTV provider is trustworthy?",
    a: "Look for: a registered business identity, a real support channel (email, WhatsApp, Telegram), HTTPS checkout, named payment methods (Mobile Money, card, bank), a clear refund policy, and verifiable customer reviews. Avoid sellers who only accept gift cards, refuse refunds, or rebrand frequently.",
  },
  {
    q: "Is it safe to share my payment details with an IPTV service?",
    a: "Only if the checkout runs over HTTPS and the payment is processed by a recognized provider (e.g. a licensed payment gateway, card network, or Mobile Money operator). Never send card numbers by chat, email, or screenshot.",
  },
  {
    q: "What about VPNs and IPTV?",
    a: "Using a VPN with a legitimate IPTV subscription is legal in most countries and improves privacy on public networks. A VPN does not, however, make an unlicensed service legal.",
  },
];

export const Route = createFileRoute("/legal-guide")({
  head: () => ({
    meta: [
      { title: "Is IPTV Legal? Safety Guide — Nexora IPTV" },
      { name: "description", content: "Clear guide to IPTV legality and safety in the USA, UK, EU, Canada and Australia. How to spot a trustworthy provider and stream safely." },
      { property: "og:title", content: "Is IPTV Legal? Safety & Legality Guide — Nexora IPTV" },
      { property: "og:description", content: "IPTV legality explained for the USA, UK, EU, Canada and Australia, plus a checklist to choose a safe provider." },
      { property: "og:url", content: "https://nexora-iptv.com/legal-guide" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal-guide" }],
    scripts: [
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
    ],
  }),
  component: LegalGuidePage,
});

function LegalGuidePage() {
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
        <article className="max-w-3xl mx-auto px-6">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Guide · Updated 2026</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Is IPTV Legal? A Practical Guide to IPTV Legality &amp; Safety
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            IPTV (Internet Protocol Television) is a legal way to deliver TV channels and on-demand
            video over the internet. Whether a specific IPTV <em>service</em> is legal depends on one
            thing: does it have the rights to distribute the content it streams? This guide explains
            the rules in the USA, UK, EU, Canada and Australia, and gives you a short checklist to
            pick a provider safely.
          </p>

          <section className="grid sm:grid-cols-2 gap-4 mb-12">
            <Card icon={<Scale className="h-5 w-5" />} title="The technology is legal">
              Streaming TV over IP is a standard, regulated technology used by major operators worldwide.
            </Card>
            <Card icon={<ShieldCheck className="h-5 w-5" />} title="Licensing decides everything">
              A provider is legal when it holds distribution rights for the channels and VOD it offers.
            </Card>
            <Card icon={<Globe2 className="h-5 w-5" />} title="Rules vary by country">
              Local copyright and broadcasting laws apply — the principles are similar across most markets.
            </Card>
            <Card icon={<AlertTriangle className="h-5 w-5" />} title="Red flags exist">
              Anonymous sellers, gift-card-only payments and absurdly low prices are warning signs.
            </Card>
          </section>

          <h2 className="text-2xl font-semibold mb-4">IPTV legality by region</h2>
          <Region
            title="United States"
            body="IPTV is legal in the U.S. The Digital Millennium Copyright Act (DMCA) and the Protecting Lawful Streaming Act target unlicensed redistribution of copyrighted programming, not the IPTV protocol itself. Subscribers who use a licensed service are fully within the law."
          />
          <Region
            title="United Kingdom"
            body="IPTV is legal in the UK. The Copyright, Designs and Patents Act 1988 and Ofcom rules govern how broadcasters license content. Using a properly licensed IPTV service is legal; using one that streams unlicensed Sky, BT Sport or Premier League feeds is not."
          />
          <Region
            title="European Union"
            body="The EU Copyright Directive (2019/790) and the AVMS Directive create a common framework across member states. IPTV providers must respect territorial licensing. Subscribers should choose services with a visible legal entity inside or licensed for the EU."
          />
          <Region
            title="Canada"
            body="Canadian Copyright Act provisions and CRTC oversight apply to broadcasting. IPTV is legal; redistribution without authorization is not. Federal Court orders have targeted unlicensed IPTV resellers, not end users of licensed services."
          />
          <Region
            title="Australia"
            body="The Copyright Act 1968 (as amended) covers online streaming. IPTV technology is legal, and Australian courts have issued blocking orders against unlicensed streaming sites — again, focused on suppliers, not subscribers of legitimate platforms."
          />

          <h2 className="text-2xl font-semibold mt-12 mb-4">How to choose a safe IPTV provider</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Clear company information, contact details and physical address or registered entity.",
              "HTTPS checkout and a recognized payment processor (Mobile Money, card, bank transfer).",
              "Transparent pricing, plan terms, and a written refund or cancellation policy.",
              "Real customer support reachable on multiple channels with documented response times.",
              "Server credentials and account access delivered by email after payment is confirmed.",
              "Public reviews on independent platforms — not just on the provider's own website.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-4">Red flags to avoid</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Sellers who only accept gift cards, cryptocurrency to anonymous wallets, or cash-by-courier.",
              "Prices dramatically below the rest of the market for premium sports or PPV content.",
              "No refund policy, no support address, or a domain registered just weeks ago.",
              "Pressure to install unsigned APKs or to disable device security warnings.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-6">Frequently asked questions</h2>
          <div className="space-y-6 mb-12">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Tv className="h-8 w-8 text-[color:var(--gold)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Looking for a transparent IPTV subscription?</p>
              <p className="text-sm text-muted-foreground">Nexora IPTV uses HTTPS checkout, named payment methods and 24/7 support — review our plans before you decide.</p>
            </div>
            <Link to="/" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold whitespace-nowrap">View plans</Link>
          </div>

          <p className="text-xs text-muted-foreground mt-10">
            This guide is informational and does not constitute legal advice. Laws change — consult a qualified lawyer in your jurisdiction for binding guidance.
          </p>
        </article>
      </main>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Region({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}