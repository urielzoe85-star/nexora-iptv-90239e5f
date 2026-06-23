import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Smartphone, Monitor, Download, KeyRound, PlayCircle, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

const FAQ = [
  {
    q: "Comment installer IPTV sur ma TV ou mon téléphone ?",
    a: "Installez une application compatible (IPTV Smarters Pro, TiviMate, Smart IPTV, GSE Smart IPTV ou XCIPTV), ouvrez-la, choisissez « Ajouter un utilisateur » ou « Add Playlist », puis renseignez l'URL M3U ou les identifiants Xtream Codes (hôte, nom d'utilisateur, mot de passe) reçus par e-mail après votre abonnement. L'application charge alors la liste des chaînes et la VOD en quelques secondes.",
  },
  {
    q: "Comment regarder la TV en direct gratuitement sur internet ?",
    a: "Les chaînes françaises gratuites (TF1, France 2, France 3, M6, Arte, BFM) sont disponibles légalement et gratuitement sur france.tv, TF1+, 6play, Arte.tv et molotov.tv. Pour un bouquet international ou des chaînes premium en un seul player, une application IPTV avec un abonnement légal regroupe tout dans une seule interface.",
  },
  {
    q: "Quelle est la meilleure application pour IPTV ?",
    a: "Sur Android et Android TV : IPTV Smarters Pro et TiviMate sont les plus populaires. Sur iPhone / iPad et Apple TV : IPTV Smarters Pro et GSE Smart IPTV. Sur Smart TV Samsung / LG : Smart IPTV ou SET IPTV. Sur Fire TV Stick : IPTV Smarters Pro via le Amazon App Store.",
  },
  {
    q: "Comment avoir IPTV sur Smart TV sans box Android ?",
    a: "Sur Samsung et LG, installez Smart IPTV ou SET IPTV depuis le store de la TV, notez l'adresse MAC affichée par l'application, puis ajoutez votre liste M3U via le portail web de l'application. La TV télécharge la playlist automatiquement à chaque démarrage.",
  },
  {
    q: "Quels appareils sont compatibles IPTV ?",
    a: "Android / Android TV, iOS / Apple TV, Smart TV Samsung Tizen et LG webOS, Fire TV Stick, box MAG (Infomir), Formuler, Windows, macOS, Linux et tout navigateur web moderne via un lecteur en ligne.",
  },
  {
    q: "Pourquoi mon IPTV ne fonctionne pas ou bufferise ?",
    a: "Vérifiez : (1) votre débit (15 Mbps minimum pour le FHD, 25 Mbps pour le 4K), (2) que vous êtes connecté en Ethernet ou Wi-Fi 5 GHz, (3) que la date et l'heure de l'appareil sont correctes, (4) que l'application est à jour. Si une chaîne précise ne charge pas, essayez un autre flux du même bouquet — le serveur peut basculer automatiquement.",
  },
  {
    q: "Faut-il un VPN pour regarder la TV en direct sur internet ?",
    a: "Un VPN n'est pas obligatoire avec un abonnement IPTV légal. Il améliore la confidentialité sur les Wi-Fi publics et peut débloquer certaines chaînes géo-restreintes, mais ne rend pas légal un service non autorisé.",
  },
];

export const Route = createFileRoute("/fr/guide-iptv")({
  head: () => ({
    meta: [
      { title: "Comment installer IPTV et regarder la TV en direct sur internet — Guide 2026" },
      { name: "description", content: "Guide pas à pas en français pour installer IPTV sur Smart TV, Android, iPhone, Fire TV et Apple TV, configurer vos accès (M3U / Xtream) et regarder la TV en direct sur internet." },
      { property: "og:title", content: "Comment installer IPTV et regarder la TV en direct — Guide Nexora" },
      { property: "og:description", content: "Installation IPTV étape par étape : applications, configuration M3U / Xtream Codes, dépannage et FAQ." },
      { property: "og:url", content: "https://nexora-iptv.com/fr/guide-iptv" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/fr/guide-iptv" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Comment installer IPTV et regarder la TV en direct sur internet",
          description: "Installer une application IPTV, configurer ses accès M3U ou Xtream Codes et lancer le streaming en direct sur tous les appareils.",
          totalTime: "PT5M",
          step: [
            { "@type": "HowToStep", name: "Choisir une application IPTV", text: "Installer IPTV Smarters Pro, TiviMate, Smart IPTV ou GSE Smart IPTV selon l'appareil." },
            { "@type": "HowToStep", name: "Récupérer ses accès", text: "Ouvrir l'e-mail de confirmation et noter l'URL M3U ou les identifiants Xtream Codes (hôte, utilisateur, mot de passe)." },
            { "@type": "HowToStep", name: "Ajouter la playlist", text: "Dans l'application, choisir « Ajouter un utilisateur » ou « Add Playlist » puis coller les informations." },
            { "@type": "HowToStep", name: "Lancer le direct", text: "Attendre le chargement des chaînes, ouvrir la catégorie souhaitée et démarrer le flux en direct ou la VOD." },
          ],
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
    ],
  }),
  component: GuideIPTVPage,
});

function GuideIPTVPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/fr" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/fr" className="text-sm text-muted-foreground hover:text-foreground transition">← Accueil</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <article className="max-w-3xl mx-auto px-6">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Guide · Mis à jour 2026</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Comment installer IPTV et regarder la TV en direct sur internet
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Ce guide explique en français comment installer une application IPTV, configurer vos
            accès (lien M3U ou Xtream Codes) et regarder la TV en direct sur internet depuis votre
            Smart TV, smartphone, ordinateur ou box Android. Suivez les étapes — l'activation
            prend moins de cinq minutes.
          </p>

          <section className="grid sm:grid-cols-2 gap-4 mb-12">
            <FeatureCard icon={<Download className="h-5 w-5" />} title="1. Installer l'application">
              IPTV Smarters Pro, TiviMate, Smart IPTV ou GSE Smart IPTV selon votre appareil.
            </FeatureCard>
            <FeatureCard icon={<KeyRound className="h-5 w-5" />} title="2. Récupérer vos accès">
              Lien M3U ou identifiants Xtream Codes envoyés par e-mail après l'abonnement.
            </FeatureCard>
            <FeatureCard icon={<Tv className="h-5 w-5" />} title="3. Ajouter la playlist">
              Coller l'URL M3U ou saisir hôte, utilisateur et mot de passe dans l'application.
            </FeatureCard>
            <FeatureCard icon={<PlayCircle className="h-5 w-5" />} title="4. Lancer le direct">
              Les chaînes apparaissent en quelques secondes, classées par catégorie.
            </FeatureCard>
          </section>

          <h2 className="text-2xl font-semibold mb-4">Quelle application IPTV choisir ?</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            <AppCard icon={<Smartphone className="h-5 w-5" />} title="Android & Android TV" apps="IPTV Smarters Pro, TiviMate, XCIPTV" />
            <AppCard icon={<Smartphone className="h-5 w-5" />} title="iPhone, iPad & Apple TV" apps="IPTV Smarters Pro, GSE Smart IPTV" />
            <AppCard icon={<Tv className="h-5 w-5" />} title="Smart TV Samsung & LG" apps="Smart IPTV, SET IPTV (pas besoin de box)" />
            <AppCard icon={<Tv className="h-5 w-5" />} title="Fire TV Stick" apps="IPTV Smarters Pro via Amazon App Store" />
            <AppCard icon={<Monitor className="h-5 w-5" />} title="Windows, macOS, Linux" apps="IPTV Smarters, VLC, MyIPTV Player" />
            <AppCard icon={<Monitor className="h-5 w-5" />} title="Box MAG / Formuler" apps="Stalker / Portal URL fournie à l'abonnement" />
          </div>

          <h2 className="text-2xl font-semibold mb-4">Installer IPTV Smarters Pro — étape par étape</h2>
          <ol className="space-y-4 mb-12 list-decimal pl-5 text-muted-foreground leading-relaxed marker:text-[color:var(--gold)] marker:font-semibold">
            <li><strong className="text-foreground">Télécharger l'application</strong> depuis le Google Play Store, l'App Store ou l'Amazon App Store selon votre appareil.</li>
            <li><strong className="text-foreground">Ouvrir l'application</strong> et accepter les conditions d'utilisation puis l'accès au stockage.</li>
            <li><strong className="text-foreground">Choisir « Login with Xtream Codes API »</strong> (recommandé) — cette méthode synchronise EPG et VOD.</li>
            <li><strong className="text-foreground">Renseigner vos accès</strong> reçus par e-mail : un nom au choix, l'URL du serveur (ex. <code className="text-[color:var(--gold)]">http://server.exemple.com:8080</code>), votre utilisateur et votre mot de passe.</li>
            <li><strong className="text-foreground">Valider</strong> — l'application charge la liste des chaînes, le guide TV et la VOD.</li>
            <li><strong className="text-foreground">Ouvrir « Live TV »</strong>, choisir une catégorie (Sport, France, International…) et lancer le direct.</li>
          </ol>

          <h2 className="text-2xl font-semibold mb-4">Configurer une playlist M3U manuellement</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            La méthode M3U fonctionne avec presque toutes les applications IPTV. Dans l'application,
            choisissez « Add Playlist » → « M3U URL », collez le lien fourni par votre fournisseur
            puis enregistrez. Évitez la méthode « M3U File » : si vous changez d'appareil ou de réseau,
            la liste devra être réimportée à chaque mise à jour.
          </p>

          <h2 className="text-2xl font-semibold mb-4">Regarder la TV en direct gratuitement</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Pour les chaînes françaises de la TNT (TF1, France 2, France 3, M6, Arte, BFM TV, CNews),
            les diffuseurs proposent leur direct gratuitement et légalement sur leurs plateformes
            officielles : <strong>france.tv</strong>, <strong>TF1+</strong>, <strong>6play</strong>,
            <strong> Arte.tv</strong> et <strong>molotov.tv</strong>. Pour un bouquet international
            ou des chaînes premium centralisées dans un seul lecteur, un abonnement IPTV légal reste
            la solution la plus pratique.
          </p>

          <h2 className="text-2xl font-semibold mb-4">Dépannage rapide</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Buffering constant : passez en Ethernet ou Wi-Fi 5 GHz, redémarrez la box internet, vérifiez votre débit (15 Mbps FHD, 25 Mbps 4K).",
              "Erreur d'authentification : recopiez précisément l'URL, l'utilisateur et le mot de passe (attention aux espaces et majuscules).",
              "Aucune chaîne ne s'affiche : vérifiez la date et l'heure de l'appareil, puis mettez à jour l'application.",
              "Une seule chaîne plante : changez de flux dans le même bouquet ou attendez quelques minutes — le serveur peut basculer.",
              "EPG vide : reconnectez-vous via Xtream Codes plutôt que via M3U pour activer le guide TV.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-4">Bonnes pratiques</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Choisir un fournisseur transparent (entité légale, paiement HTTPS, support joignable).",
              "Garder vos accès Xtream confidentiels : ne les partagez jamais sur les forums.",
              "Activer les mises à jour automatiques de l'application pour conserver les codecs récents.",
              "Utiliser un câble HDMI 2.0 minimum pour la 4K HDR.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><HelpCircle className="h-6 w-6 text-[color:var(--gold)]" /> Questions fréquentes</h2>
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
              <p className="font-semibold mb-1">Prêt à regarder la TV en direct ?</p>
              <p className="text-sm text-muted-foreground">Découvrez les abonnements Nexora IPTV : activation instantanée, multi-appareils et support 24/7 en français.</p>
            </div>
            <Link to="/fr" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold whitespace-nowrap">Voir les offres</Link>
          </div>
        </article>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function AppCard({ icon, title, apps }: { icon: React.ReactNode; title: string; apps: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{apps}</p>
    </div>
  );
}