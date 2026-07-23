import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Users, TrendingUp, Wallet, Settings2, Headphones, Rocket, ShieldCheck } from "lucide-react";

const BENEFITS = [
  { icon: <Wallet className="h-5 w-5" />, title: "Tarifs de gros", desc: "Achetez vos crédits IPTV en volume et dégagez 40 à 70 % de marge sur chaque abonnement revendu." },
  { icon: <Settings2 className="h-5 w-5" />, title: "Panel revendeur dédié", desc: "Créez, renouvelez, suspendez et gérez les lignes clients depuis un tableau de bord dédié — M3U + Xtream Codes." },
  { icon: <Rocket className="h-5 w-5" />, title: "Activation instantanée", desc: "Générez de nouveaux comptes IPTV en quelques secondes. Aucune attente, aucun ticket manuel, aucune interruption." },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Serveurs premium stables", desc: "+20 000 chaînes, 80 000+ VOD en HD/FHD/4K sur serveurs redondants avec bascule automatique." },
  { icon: <Headphones className="h-5 w-5" />, title: "Support B2B prioritaire", desc: "Canal de support 24/7 dédié aux revendeurs — français, anglais, allemand, espagnol, italien." },
  { icon: <TrendingUp className="h-5 w-5" />, title: "Développez votre activité IPTV", desc: "Prêt en marque blanche, kit marketing fourni, aucun engagement mensuel après votre pack de démarrage." },
];

const CREDIT_PACKS = [
  { name: "Starter", credits: 10, price: "90 €", perLine: "9,00 €", best: "Testez le marché, revendez à vos proches." },
  { name: "Growth", credits: 25, price: "200 €", perLine: "8,00 €", best: "Petits revendeurs constituant leur base clients.", highlight: true },
  { name: "Business", credits: 50, price: "350 €", perLine: "7,00 €", best: "Revendeurs actifs avec clientèle récurrente." },
  { name: "Pro", credits: 100, price: "600 €", perLine: "6,00 €", best: "Boutiques établies et agences IPTV." },
  { name: "Elite", credits: 250, price: "1 250 €", perLine: "5,00 €", best: "Grossistes et opérateurs multi-pays." },
];

const STEPS = [
  { n: "1", title: "Demandez votre compte revendeur", desc: "Contactez-nous sur WhatsApp ou par email avec les infos de votre activité. Validation en moins de 24 h." },
  { n: "2", title: "Achetez votre premier pack de crédits", desc: "Choisissez un pack de 10 à 250 crédits. 1 crédit = 1 abonnement IPTV d'un mois (fractionnable en essais plus courts)." },
  { n: "3", title: "Accédez au panel revendeur", desc: "Connectez-vous à votre panel IPTV revendeur, créez les lignes clients, fixez l'expiration, générez les identifiants M3U ou Xtream Codes." },
  { n: "4", title: "Revendez à votre prix", desc: "Fixez votre prix de vente, livrez les identifiants à vos clients, conservez 100 % de la marge. Rechargez à tout moment." },
];

const FAQ = [
  {
    q: "Qu'est-ce qu'un programme revendeur IPTV ?",
    a: "Un programme revendeur IPTV vous permet d'acheter des abonnements IPTV au prix de gros auprès d'un fournisseur comme Nexora IPTV, puis de les revendre à vos propres clients au prix de détail. Vous conservez la marge et gérez vos clients depuis un panel revendeur dédié.",
  },
  {
    q: "Comment fonctionne le panel revendeur Nexora IPTV ?",
    a: "Après validation, vous recevez un accès à un panel revendeur web où vous pouvez créer de nouvelles lignes IPTV, renouveler ou suspendre les lignes existantes, générer des liens M3U ou des identifiants Xtream Codes, définir des durées d'essai et suivre vos clients actifs — le tout en temps réel.",
  },
  {
    q: "Combien coûte le programme revendeur IPTV ?",
    a: "Les crédits revendeur Nexora IPTV commencent à 90 € pour 10 crédits (9 € la ligne) et descendent jusqu'à 5 € la ligne sur le pack Elite 250 crédits. Aucun abonnement mensuel — vous ne payez que les crédits consommés, et les crédits non utilisés n'expirent jamais.",
  },
  {
    q: "Combien puis-je gagner en tant que revendeur IPTV ?",
    a: "Les prix de vente d'un abonnement IPTV de 12 mois se situent généralement entre 60 € et 120 €. Avec un coût de gros de 5 à 9 € par crédit (1 mois), la plupart des revendeurs actifs dégagent 40 à 70 % de marge par client après les frais marketing.",
  },
  {
    q: "Faut-il des compétences techniques pour démarrer ?",
    a: "Non. Le panel revendeur est pensé pour des utilisateurs non techniques — créer une ligne prend moins de 30 secondes. Notre équipe fournit également un onboarding, des supports marketing prêts à l'emploi et un support prioritaire 24/7 pour vous lancer rapidement.",
  },
  {
    q: "Puis-je proposer le service en marque blanche ?",
    a: "Oui. Vous livrez les identifiants sous votre propre marque, à vos tarifs et via vos propres canaux de communication. Nexora IPTV agit en tant que fournisseur de gros silencieux — vos clients ne voient que vous.",
  },
];

export const Route = createFileRoute("/reseller")({
  head: () => ({
    meta: [
      { title: "Programme Revendeur IPTV — Panel revendeur & crédits Nexora IPTV" },
      { name: "description", content: "Rejoignez le programme revendeur IPTV Nexora. Crédits en gros dès 5 €/ligne, panel revendeur dédié, activation instantanée, +20 000 chaînes et 4K. Lancez votre activité IPTV dès aujourd'hui." },
      { property: "og:title", content: "Programme Revendeur IPTV — Nexora IPTV" },
      { property: "og:description", content: "Crédits IPTV en gros, panel revendeur dédié, activation instantanée et support B2B 24/7. Lancez votre activité IPTV avec Nexora." },
      { property: "og:url", content: "https://nexora-iptv.com/reseller" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Programme Revendeur IPTV — Nexora IPTV" },
      { name: "twitter:description", content: "Devenez revendeur IPTV avec Nexora : crédits en gros, panel revendeur, activation instantanée, catalogue 4K et support 24/7." },
    ],
    links: [
      { rel: "canonical", href: "https://nexora-iptv.com/reseller" },
      { rel: "alternate", hrefLang: "fr", href: "https://nexora-iptv.com/reseller" },
      { rel: "alternate", hrefLang: "en", href: "https://nexora-iptv.com/en/reseller" },
      { rel: "alternate", hrefLang: "x-default", href: "https://nexora-iptv.com/reseller" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Programme Revendeur IPTV Nexora",
          serviceType: "Programme revendeur IPTV",
          provider: { "@type": "Organization", name: "Nexora IPTV", url: "https://nexora-iptv.com" },
          areaServed: "Worldwide",
          description: "Crédits IPTV en gros et panel revendeur dédié pour lancer et développer votre propre activité IPTV.",
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
            { "@type": "ListItem", position: 1, name: "Accueil", item: "https://nexora-iptv.com/" },
            { "@type": "ListItem", position: 2, name: "Programme Revendeur IPTV", item: "https://nexora-iptv.com/reseller" },
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
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Accueil</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <section className="max-w-4xl mx-auto px-6 text-center mb-16">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Nexora IPTV · Programme B2B</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Programme Revendeur IPTV — Lancez votre activité IPTV
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Devenez <strong>revendeur Nexora IPTV</strong> et accédez en gros à plus de 20 000 chaînes en direct,
            80 000+ films et séries en HD/FHD/4K, un <strong>panel revendeur IPTV</strong> dédié,
            l'activation instantanée et un support B2B prioritaire 24/7. Sans abonnement mensuel — payez
            uniquement les crédits que vous consommez, revendez à votre prix et conservez toute la marge.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/message" className="px-6 py-3 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold">Candidater comme revendeur</a>
            <Link to="/" className="px-6 py-3 rounded-lg border border-white/15 hover:bg-white/5 transition">Retour à l'accueil</Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Pourquoi rejoindre le programme revendeur Nexora IPTV</h2>
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-3 text-center">Packs de crédits revendeur IPTV & tarifs</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            1 crédit = 1 abonnement IPTV d'un mois. Les crédits n'expirent jamais et peuvent être fractionnés en essais plus courts depuis le panel revendeur.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr>
                  <th className="p-3 font-semibold">Pack</th>
                  <th className="p-3 font-semibold">Crédits</th>
                  <th className="p-3 font-semibold">Prix total</th>
                  <th className="p-3 font-semibold">Par ligne</th>
                  <th className="p-3 font-semibold">Idéal pour</th>
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Comment fonctionne le panel revendeur IPTV</h2>
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Ce que vous obtenez en tant que revendeur Nexora IPTV</h2>
          <ul className="space-y-3">
            {[
              "Crédits IPTV en gros à partir de 5 € la ligne sur le pack Elite.",
              "Panel revendeur dédié : création, renouvellement, suspension, génération d'identifiants M3U + Xtream Codes.",
              "+20 000 chaînes en direct et 80 000+ titres VOD mis à jour quotidiennement, en HD/FHD/4K avec EPG.",
              "Création instantanée de lignes — activez un nouveau client en moins de 30 secondes.",
              "Support B2B prioritaire 24/7 avec un canal multilingue dédié.",
              "Prêt en marque blanche : livrez sous votre marque, conservez 100 % de la marge.",
              "Kit marketing : bannières, descriptions produits, tableaux comparatifs prêts à publier.",
              "Sans engagement mensuel, sans expiration des crédits inutilisés, sans frais cachés.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">FAQ Revendeur IPTV</h2>
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
              <p className="font-semibold mb-1">Prêt à lancer votre activité de revendeur IPTV ?</p>
              <p className="text-sm text-muted-foreground">Candidatez aujourd'hui — validation en moins de 24 h, premiers crédits activés le jour même.</p>
            </div>
            <a href="https://wa.me/message" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold whitespace-nowrap">Candidater</a>
          </div>
        </section>
      </main>
    </div>
  );
}