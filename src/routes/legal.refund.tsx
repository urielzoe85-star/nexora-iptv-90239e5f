import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/refund")({
  head: () => ({
    meta: [
      { title: "Politique de remboursement — Nexora IPTV" },
      { name: "description", content: "Conditions de remboursement Nexora IPTV : indisponibilité prolongée, échec de livraison, modalités de demande." },
      { property: "og:title", content: "Politique de remboursement — Nexora IPTV" },
      { property: "og:description", content: "Conditions et procédure de remboursement Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/legal/refund" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal/refund" }],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalLayout
      title="Politique de remboursement"
      intro="Cette politique complète les CGV et précise les cas dans lesquels un remboursement peut être accordé, ainsi que la procédure à suivre."
    >
      <h2>1. Principe</h2>
      <p>Le service IPTV étant un contenu numérique livré immédiatement, le droit de rétractation légal ne s'applique pas dès l'activation des identifiants (article L221-28 du Code de la consommation). Nexora IPTV accorde toutefois un remboursement dans les cas exceptionnels listés ci-dessous.</p>

      <h2>2. Cas donnant lieu à remboursement</h2>
      <ul>
        <li><strong>Non-livraison</strong> : identifiants non transmis dans les 24 h suivant la confirmation de paiement, sans possibilité de rétablissement.</li>
        <li><strong>Indisponibilité prolongée</strong> : Service inaccessible plus de 72 h consécutives, sur incident imputable à Nexora IPTV ou à son fournisseur amont.</li>
        <li><strong>Erreur de facturation</strong> : double débit constaté sur la même transaction Mobile Money.</li>
      </ul>

      <h2>3. Cas exclus</h2>
      <ul>
        <li>Insuffisance de la connexion internet du client.</li>
        <li>Incompatibilité matérielle non signalée par le client avant achat.</li>
        <li>Suspension pour violation des CGU (partage massif d'identifiants, redistribution).</li>
        <li>Simple changement d'avis après activation.</li>
      </ul>

      <h2>4. Procédure</h2>
      <ol>
        <li>Envoyer un email à <a href="mailto:support@nexora-iptv.com">support@nexora-iptv.com</a> avec la référence de commande (NX-XXXXXXXXXX) et la description du problème.</li>
        <li>Le support tente une résolution technique sous 24 h ouvrées.</li>
        <li>En cas d'échec, la demande de remboursement est instruite sous 5 jours ouvrés.</li>
        <li>Le remboursement est effectué sur le même moyen de paiement (Mobile Money), sous un délai de 7 à 14 jours ouvrés selon l'opérateur.</li>
      </ol>

      <h2>5. Compensation alternative</h2>
      <p>Le client peut opter, en accord avec Nexora IPTV, pour une extension d'abonnement équivalente en lieu et place du remboursement financier.</p>
    </LegalLayout>
  );
}
