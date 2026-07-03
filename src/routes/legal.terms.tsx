import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — Nexora IPTV" },
      { name: "description", content: "Conditions Générales d'Utilisation du service Nexora IPTV : accès, comptes, obligations, responsabilité, résiliation." },
      { property: "og:title", content: "CGU — Nexora IPTV" },
      { property: "og:description", content: "Conditions Générales d'Utilisation du service Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/legal/terms" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation"
      intro="Les présentes CGU régissent l'accès et l'utilisation du service Nexora IPTV (le « Service ») fourni via le site nexora-iptv.com. En créant un compte ou en souscrivant une offre, le client déclare avoir pris connaissance et accepté sans réserve les présentes conditions."
    >
      <h2>1. Objet</h2>
      <p>Le Service permet à l'abonné d'accéder, via internet, à un bouquet de chaînes de télévision et de contenus à la demande diffusés par des ayants droit tiers. Nexora IPTV agit en qualité de revendeur autorisé.</p>

      <h2>2. Accès et compte</h2>
      <p>L'accès au Service est réservé aux personnes majeures. L'abonné s'engage à fournir des informations exactes lors de la souscription (nom, adresse email, numéro Mobile Money) et à conserver ses identifiants confidentiels. Toute utilisation du compte est réputée effectuée par le titulaire.</p>

      <h2>3. Obligations de l'abonné</h2>
      <ul>
        <li>Utiliser le Service à des fins strictement privées, dans le cercle familial.</li>
        <li>Ne pas revendre, redistribuer ou diffuser publiquement les flux fournis.</li>
        <li>Ne pas contourner ou tenter de contourner les mesures techniques de protection.</li>
        <li>Disposer d'une connexion internet suffisante (10 Mbps minimum recommandé).</li>
      </ul>

      <h2>4. Disponibilité du Service</h2>
      <p>Nexora IPTV met en œuvre les moyens techniques nécessaires pour assurer une disponibilité continue du Service. Des interruptions ponctuelles peuvent survenir pour maintenance, mise à jour ou en raison d'incidents chez les fournisseurs de contenu. Nexora IPTV ne saurait être tenue responsable de ces interruptions dès lors qu'elles restent raisonnables.</p>

      <h2>5. Propriété intellectuelle</h2>
      <p>Les contenus diffusés restent la propriété exclusive de leurs ayants droit. Aucune cession de droits n'est accordée à l'abonné, à l'exception d'un droit personnel, non exclusif et non cessible d'accès pendant la durée de l'abonnement.</p>

      <h2>6. Suspension et résiliation</h2>
      <p>Nexora IPTV se réserve le droit de suspendre ou de résilier immédiatement, sans préavis ni remboursement, tout compte constaté en violation des présentes CGU (partage massif d'identifiants, revente, redistribution publique, utilisation frauduleuse).</p>

      <h2>7. Modifications</h2>
      <p>Les présentes CGU peuvent être modifiées à tout moment. La version applicable est celle en vigueur au jour de la souscription. Toute mise à jour substantielle fait l'objet d'une notification par email.</p>

      <h2>8. Droit applicable</h2>
      <p>Les présentes CGU sont régies par le droit béninois. Tout litige sera soumis, à défaut d'accord amiable, aux tribunaux compétents de Cotonou.</p>
    </LegalLayout>
  );
}
