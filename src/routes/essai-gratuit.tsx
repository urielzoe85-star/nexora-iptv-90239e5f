import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Tv, Smartphone, Zap, Clock, ShieldCheck, Gift } from "lucide-react";
import { toast } from "sonner";
import { requestFreeTrial } from "@/lib/trials.functions";

const INCLUDED = [
  { icon: <Tv className="h-5 w-5" />, title: "+20 000 chaînes live", desc: "Sport, cinéma, actualités, jeunesse, chaînes internationales HD/FHD/4K." },
  { icon: <Gift className="h-5 w-5" />, title: "VOD 4K illimitée", desc: "80 000+ films et séries, catalogue mis à jour quotidiennement." },
  { icon: <Smartphone className="h-5 w-5" />, title: "Multi-appareils", desc: "Smart TV, Firestick, Android, iOS, Mac, PC, box IPTV." },
  { icon: <Clock className="h-5 w-5" />, title: "EPG & replay", desc: "Guide TV 7 jours et fonction replay sur les chaînes principales." },
];

const STEPS = [
  { n: "1", title: "Remplissez le formulaire", desc: "Email + WhatsApp ou Telegram. Aucune carte bancaire demandée." },
  { n: "2", title: "Recevez vos accès en 5 min", desc: "Identifiants Xtream Codes + lien M3U envoyés sur le canal choisi." },
  { n: "3", title: "Regardez pendant 24h", desc: "Configuration guidée sur votre appareil, support 24/7 en cas de blocage." },
];

const FAQ = [
  { q: "L'essai IPTV gratuit est-il vraiment sans engagement ?", a: "Oui. L'essai gratuit 24h Nexora IPTV ne demande aucune carte bancaire, aucun moyen de paiement et ne se transforme jamais automatiquement en abonnement payant. Vous décidez librement de souscrire à la fin des 24 heures." },
  { q: "Combien de temps dure l'essai gratuit ?", a: "L'essai dure 24 heures à compter de l'activation de vos identifiants. Vous accédez pendant cette période à l'intégralité du catalogue Nexora IPTV : chaînes live, VOD, EPG et replay." },
  { q: "Sur quels appareils puis-je tester l'IPTV gratuitement ?", a: "L'essai gratuit fonctionne sur Smart TV Samsung/LG, Amazon Firestick, Android TV, box IPTV, smartphones iOS et Android, tablettes, Mac et PC via des applications comme IBO Player, Smarters Pro, TiviMate ou M-IBO." },
  { q: "Combien de temps pour recevoir mes accès d'essai ?", a: "Les identifiants sont envoyés en moins de 5 minutes en journée, sur le canal choisi (WhatsApp, Telegram ou email). En cas de forte affluence, comptez maximum 30 minutes." },
  { q: "Que se passe-t-il après les 24h d'essai ?", a: "Vos accès sont automatiquement suspendus. Aucun prélèvement, aucune relance abusive. Si l'essai vous a convaincu, vous pouvez souscrire un abonnement Nexora IPTV en quelques clics et récupérer immédiatement l'accès." },
  { q: "Puis-je basculer directement en abonnement payant depuis l'essai ?", a: "Oui. À la fin de l'essai, vous pouvez conserver la même configuration et les mêmes identifiants en choisissant l'un des abonnements Nexora IPTV. Aucun paramétrage à refaire sur vos appareils." },
];

export const Route = createFileRoute("/essai-gratuit")({
  head: () => ({
    meta: [
      { title: "Essai IPTV gratuit 24h — Test sans engagement | Nexora IPTV" },
      { name: "description", content: "Testez gratuitement l'abonnement IPTV Nexora pendant 24h : +20 000 chaînes, VOD 4K, multi-appareils. Sans carte bancaire, activation en 5 minutes." },
      { property: "og:title", content: "Essai IPTV gratuit 24h — Nexora IPTV" },
      { property: "og:description", content: "Essai IPTV gratuit sans engagement : chaînes live, VOD 4K et support 24/7. Activation en 5 minutes sur WhatsApp, Telegram ou email." },
      { property: "og:url", content: "https://nexora-iptv.com/essai-gratuit" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Essai IPTV gratuit 24h — Nexora IPTV" },
      { name: "twitter:description", content: "Testez l'abonnement IPTV Nexora gratuitement pendant 24h. Sans carte bancaire, sans engagement." },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/essai-gratuit" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Essai IPTV gratuit 24h Nexora",
          serviceType: "Essai gratuit abonnement IPTV",
          provider: { "@type": "Organization", name: "Nexora IPTV", url: "https://nexora-iptv.com" },
          areaServed: "Worldwide",
          description: "Essai gratuit 24h de l'abonnement IPTV Nexora avec +20 000 chaînes, VOD 4K, multi-appareils, sans carte bancaire.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
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
            { "@type": "ListItem", position: 2, name: "Essai gratuit 24h", item: "https://nexora-iptv.com/essai-gratuit" },
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

  const m = useMutation({
    mutationFn: (input: Parameters<typeof submit>[0]["data"]) => submit({ data: input }),
    onSuccess: () => {
      setSent(true);
      toast.success("Demande reçue ! Vos accès arrivent dans quelques minutes.");
    },
    onError: (e) => toast.error((e as Error).message || "Une erreur est survenue."),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
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
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Accueil</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 text-center mb-14">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Nexora IPTV · Essai gratuit</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Essai IPTV gratuit 24h — Testez avant de vous abonner
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Activez un <strong>essai IPTV gratuit de 24 heures</strong> sur l'abonnement Nexora : +20 000 chaînes live,
            80 000+ films et séries en 4K, guide TV, replay et support 24/7. <strong>Sans carte bancaire</strong>,
            sans engagement, accès envoyé en moins de 5 minutes sur WhatsApp, Telegram ou email.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5"><ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> Sans CB</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10"><Zap className="h-4 w-4 text-[color:var(--gold)]" /> Activation en 5 min</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10"><Clock className="h-4 w-4 text-[color:var(--gold)]" /> 24h d'accès complet</span>
          </div>
        </section>

        {/* Included */}
        <section className="max-w-6xl mx-auto px-6 mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Pourquoi tester Nexora IPTV gratuitement</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INCLUDED.map((b) => (
              <div key={b.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{b.icon}<span className="font-semibold text-foreground">{b.title}</span></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 text-center mt-4">
            Essai limité à 1 appareil simultané en qualité FHD. L'accès 4K et multi-appareils est disponible dès la souscription.
          </p>
        </section>

        {/* Steps */}
        <section className="max-w-4xl mx-auto px-6 mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Activer votre essai IPTV en 3 étapes</h2>
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

        {/* Form */}
        <section id="formulaire" className="max-w-2xl mx-auto px-6 mb-20">
          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-2">Demander mon essai gratuit</h2>
            <p className="text-sm text-muted-foreground mb-6">Vos identifiants IPTV arrivent en moins de 5 minutes sur le canal choisi.</p>
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-[color:var(--gold)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Demande enregistrée ✅</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Notre équipe vous envoie vos accès d'essai dans quelques minutes.
                  Pensez à vérifier vos messages WhatsApp / Telegram / spam email.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => navigate({ to: "/" })} className="px-5 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition text-sm">Retour à l'accueil</button>
                  <Link to="/blog" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold text-sm">Voir nos guides IPTV</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required maxLength={255} placeholder="vous@exemple.com" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="channel">Canal préféré *</label>
                    <select id="channel" name="channel" required defaultValue="whatsapp" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telegram">Telegram</option>
                      <option value="email">Email uniquement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="contact">Numéro WhatsApp / Telegram</label>
                    <input id="contact" name="contact" type="text" maxLength={60} placeholder="+33 6 12 34 56 78" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="device">Appareil de test</label>
                    <select id="device" name="device" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm">
                      <option value="">— Choisir —</option>
                      <option value="Smart TV Samsung/LG">Smart TV Samsung / LG</option>
                      <option value="Amazon Firestick">Amazon Firestick</option>
                      <option value="Android TV / Box">Android TV / Box</option>
                      <option value="Smartphone Android">Smartphone Android</option>
                      <option value="iPhone / iPad">iPhone / iPad</option>
                      <option value="PC / Mac">PC / Mac</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" htmlFor="country">Pays</label>
                    <input id="country" name="country" type="text" maxLength={80} placeholder="France" className="w-full px-3 py-2.5 rounded-lg bg-black/30 border border-white/10 focus:border-[color:var(--gold)]/60 outline-none text-sm" />
                  </div>
                </div>
                {/* Honeypot */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <button type="submit" disabled={m.isPending} className="w-full px-6 py-3 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold disabled:opacity-60">
                  {m.isPending ? "Envoi…" : "Activer mon essai gratuit 24h"}
                </button>
                <p className="text-[11px] text-muted-foreground/70 text-center">
                  Aucune carte bancaire demandée. Vos données ne sont utilisées que pour l'envoi de vos accès d'essai.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Questions fréquentes sur l'essai gratuit</h2>
          <div className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cross-link CTA */}
        <section className="max-w-3xl mx-auto px-6">
          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Gift className="h-8 w-8 text-[color:var(--gold)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Vous êtes revendeur IPTV ?</p>
              <p className="text-sm text-muted-foreground">Découvrez notre <Link to="/reseller" className="underline hover:text-foreground">programme revendeur IPTV</Link> avec crédits en gros et panel dédié.</p>
            </div>
            <Link to="/" className="px-5 py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition text-sm whitespace-nowrap">Voir les offres</Link>
          </div>
        </section>
      </main>
    </div>
  );
}