import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/sales")({
  head: () => ({
    meta: [
      { title: "Conditions Générales de Vente — Nexora IPTV" },
      { name: "description", content: "Conditions Générales de Vente Nexora IPTV : prix, paiement Mobile Money, livraison des identifiants, droit de rétractation." },
      { property: "og:title", content: "CGV — Nexora IPTV" },
      { property: "og:description", content: "Conditions Générales de Vente du service Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/legal/sales" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal/sales" }],
  }),
  component: SalesPage,
});

function SalesPage() {
  return (
    <LegalLayout
      title="Conditions Générales de Vente"
      intro="Les présentes CGV régissent les ventes conclues à distance sur nexora-iptv.com entre Nexora IPTV et tout client particulier majeur."
    >
      <h2>1. Offres et prix</h2>
      <p>Les offres présentées sur le site (mensuelle, trimestrielle, semestrielle, annuelle) sont valables tant qu'elles restent affichées. Les prix sont indiqués en dollars US (USD) et débités en monnaie locale (XOF, XAF, GNF, CDF…) selon le pays du client via l'opérateur Mobile Money sélectionné.</p>

      <h2>2. Commande</h2>
      <p>La commande devient ferme après acceptation des présentes CGV et des CGU au moment du paiement. Le client reçoit un email de confirmation contenant la référence de commande.</p>

      <h2>3. Paiement</h2>
      <p>Le paiement est réalisé via le prestataire agréé <strong>SebPay</strong>, en Mobile Money (MTN, Orange, Moov, Wave selon disponibilité pays). Aucune information de paiement n'est stockée par Nexora IPTV : seule la transaction signée par SebPay est conservée pour audit.</p>

      <h2>4. Livraison</h2>
      <p>Les identifiants d'accès (nom d'utilisateur, mot de passe, portail M3U) sont livrés par email dès validation du paiement, généralement en moins de 5 minutes. En cas de retard supérieur à 24 h, contacter le support à <a href="mailto:support@nexora-iptv.com">support@nexora-iptv.com</a>.</p>

      <h2>5. Droit de rétractation</h2>
      <p>Conformément à l'article L221-28 du Code français de la consommation (et équivalents locaux), le droit de rétractation ne s'applique pas aux contenus numériques fournis sur un support immatériel dont l'exécution a commencé après accord exprès du consommateur. En acceptant les présentes CGV, le client demande expressément la livraison immédiate du Service et renonce à son droit de rétractation dès l'activation des identifiants.</p>

      <h2>6. Remboursement</h2>
      <p>Les conditions détaillées figurent dans la <a href="/legal/refund">Politique de remboursement</a>. Un remboursement est accordé si le Service reste indisponible plus de 72 h consécutives ou si la livraison des identifiants échoue et ne peut être rétablie par le support.</p>

      <h2>7. Renouvellement</h2>
      <p>Les abonnements ne sont pas reconduits automatiquement. Un email de rappel est envoyé à J-7, J-3 et J-1 avant expiration, avec un lien de renouvellement direct.</p>

      <h2>8. Service client</h2>
      <p>Support disponible 7j/7 par email (<a href="mailto:support@nexora-iptv.com">support@nexora-iptv.com</a>), WhatsApp et Telegram. Délai de réponse cible : moins de 4 heures ouvrées.</p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes CGV sont régies par le droit béninois. Litiges soumis, à défaut d'accord amiable, aux tribunaux compétents de Cotonou.</p>
    </LegalLayout>
  );
}
