import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Nexora IPTV" },
      { name: "description", content: "Comment Nexora IPTV collecte, utilise et protège vos données personnelles conformément au RGPD et aux lois locales." },
      { property: "og:title", content: "Politique de confidentialité — Nexora IPTV" },
      { property: "og:description", content: "Traitement des données personnelles chez Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/legal/privacy" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      intro="Nexora IPTV attache une importance particulière à la protection de vos données personnelles. La présente politique décrit les données collectées, les finalités de traitement et vos droits."
    >
      <h2>1. Responsable de traitement</h2>
      <p>Nexora IPTV, Cotonou (Bénin). Contact protection des données : <a href="mailto:privacy@nexora-iptv.com">privacy@nexora-iptv.com</a>.</p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Identification</strong> : nom, prénom, adresse email.</li>
        <li><strong>Paiement</strong> : numéro Mobile Money, opérateur, pays (transmis à SebPay, non stockés en clair au-delà de la référence transaction).</li>
        <li><strong>Compte IPTV</strong> : identifiants générés (username / mot de passe technique) et statut d'abonnement.</li>
        <li><strong>Journalisation</strong> : adresse IP, user-agent, horodatage des connexions à l'espace client (durée limitée à 90 jours).</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Exécution du contrat : création de compte, livraison des identifiants, support.</li>
        <li>Obligations légales : facturation, lutte contre la fraude.</li>
        <li>Intérêt légitime : sécurité (détection d'abus), amélioration du service.</li>
        <li>Consentement : envois marketing (opt-in explicite, révocable à tout moment).</li>
      </ul>

      <h2>4. Destinataires</h2>
      <p>Les données sont accessibles au personnel autorisé de Nexora IPTV et à nos sous-traitants strictement nécessaires : <strong>SebPay</strong> (paiement), <strong>MEGAOTT</strong> (fourniture IPTV en marque blanche), <strong>Supabase / Lovable Cloud</strong> (hébergement), fournisseur email transactionnel.</p>

      <h2>5. Transferts hors UE</h2>
      <p>Certains prestataires opèrent hors Union européenne. Les transferts sont encadrés par des clauses contractuelles types conformes au RGPD.</p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>Compte actif : durée de la relation contractuelle + 3 ans.</li>
        <li>Factures : 10 ans (obligation comptable).</li>
        <li>Logs de sécurité : 90 jours.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Pour exercer un droit : <a href="mailto:privacy@nexora-iptv.com">privacy@nexora-iptv.com</a>. Vous pouvez également saisir l'autorité de contrôle compétente.</p>

      <h2>8. Cookies</h2>
      <p>Le site utilise des cookies techniques strictement nécessaires (session, préférence de langue, sécurité NCC) ainsi que des cookies de mesure d'audience <strong>Google Analytics 4</strong> (identifiant <code>G-MFZ9FD4YMB</code>) afin d'améliorer l'expérience. Aucun cookie publicitaire tiers n'est déposé. Vous pouvez vous opposer au dépôt des cookies analytiques via les réglages de votre navigateur ou une extension type « Google Analytics Opt-out ».</p>

      <h2>10. À propos de nous</h2>
      <p>Pour en savoir plus sur notre mission, notre équipe et nos engagements, consultez la page <a href="/a-propos">À propos de Nexora</a>.</p>

      <h2>9. Sécurité</h2>
      <p>Les données sont hébergées sur infrastructure conforme SOC 2, avec chiffrement en transit (HTTPS/TLS 1.3) et au repos, isolation par RLS PostgreSQL et journalisation des accès administrateurs.</p>
    </LegalLayout>
  );
}
