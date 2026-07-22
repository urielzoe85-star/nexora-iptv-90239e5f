import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos de Nexora IPTV — Notre mission et notre équipe" },
      {
        name: "description",
        content:
          "Nexora IPTV — plateforme premium basée à Cotonou (Bénin). Découvrez notre mission, nos valeurs, notre équipe et nos engagements qualité, sécurité et support client 24/7.",
      },
      { property: "og:title", content: "À propos de Nexora IPTV" },
      {
        property: "og:description",
        content:
          "Notre mission : rendre le divertissement premium accessible partout en Afrique francophone et au-delà, avec un support humain 24/7.",
      },
      { property: "og:url", content: "https://nexora-iptv.com/a-propos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/a-propos" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">
              N
            </div>
            <span className="font-semibold tracking-wide">
              NEXORA <span className="text-gradient-gold">IPTV</span>
            </span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <article className="max-w-3xl mx-auto px-6">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">
            Qui sommes-nous
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            À propos de <span className="text-gradient-gold">Nexora</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Nexora est une plateforme de divertissement premium née à Cotonou (Bénin), avec une
            ambition simple : offrir à chaque foyer un accès stable, rapide et sécurisé aux
            contenus qu'il aime — sans compromis sur la qualité ni sur le support.
          </p>

          <section className="space-y-4 leading-relaxed text-muted-foreground">
            <h2 className="text-2xl font-semibold text-foreground mt-10 mb-3">Notre mission</h2>
            <p>
              Rendre le divertissement premium accessible partout en Afrique francophone et au-delà,
              grâce à une infrastructure moderne, des moyens de paiement locaux (Mobile Money,
              cartes, crypto) et un accompagnement humain à chaque étape.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-10 mb-3">Nos valeurs</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Fiabilité</strong> — un service pensé pour
                fonctionner, mesuré en continu, avec un objectif de disponibilité élevé.
              </li>
              <li>
                <strong className="text-foreground">Transparence</strong> — des offres claires,
                des factures détaillées, une politique de remboursement lisible.
              </li>
              <li>
                <strong className="text-foreground">Proximité</strong> — un support client
                francophone, joignable par WhatsApp, Messenger, e-mail et Telegram.
              </li>
              <li>
                <strong className="text-foreground">Sécurité</strong> — chiffrement HTTPS/TLS,
                isolation des données par utilisateur, journalisation des accès sensibles.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-10 mb-3">Notre équipe</h2>
            <p>
              Nexora réunit des passionnés de technologie, de streaming et de relation client.
              L'équipe couvre l'ingénierie plateforme, la livraison des abonnements, le support
              multilingue et la lutte contre la fraude — 7 jours sur 7.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-10 mb-3">Nos engagements</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Livraison des identifiants sous quelques minutes après paiement confirmé.</li>
              <li>Support réactif 24/7 sur les canaux WhatsApp, Messenger, Telegram et e-mail.</li>
              <li>
                Respect strict de la vie privée — voir notre{" "}
                <Link to="/legal/privacy" className="text-[color:var(--gold)] hover:underline">
                  politique de confidentialité
                </Link>
                .
              </li>
              <li>Politique de remboursement claire en cas de dysfonctionnement avéré.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-10 mb-3">Nous contacter</h2>
            <p>
              Une question, un partenariat, une demande presse ? Écrivez-nous à{" "}
              <a
                href="mailto:contact@nexora-iptv.com"
                className="text-[color:var(--gold)] hover:underline"
              >
                contact@nexora-iptv.com
              </a>{" "}
              — nous répondons sous 24 h ouvrées.
            </p>
          </section>

          <div className="mt-16 flex flex-wrap gap-3 text-sm">
            <Link
              to="/legal/notice"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[color:var(--gold)]/50 text-muted-foreground hover:text-foreground transition"
            >
              Mentions légales
            </Link>
            <Link
              to="/legal/privacy"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[color:var(--gold)]/50 text-muted-foreground hover:text-foreground transition"
            >
              Confidentialité
            </Link>
            <Link
              to="/legal/terms"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[color:var(--gold)]/50 text-muted-foreground hover:text-foreground transition"
            >
              CGU
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}