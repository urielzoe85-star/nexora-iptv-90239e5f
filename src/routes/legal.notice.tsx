import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/legal/notice")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Nexora IPTV" },
      { name: "description", content: "Mentions légales du site nexora-iptv.com : éditeur, hébergement, contact." },
      { property: "og:title", content: "Mentions légales — Nexora IPTV" },
      { property: "og:description", content: "Éditeur, hébergement et contact du site Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/legal/notice" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/legal/notice" }],
  }),
  component: NoticePage,
});

function NoticePage() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        <strong>Nexora IPTV</strong><br />
        Cotonou, République du Bénin<br />
        Email : <a href="mailto:contact@nexora-iptv.com">contact@nexora-iptv.com</a><br />
        Support : <a href="mailto:support@nexora-iptv.com">support@nexora-iptv.com</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Le représentant légal de Nexora IPTV.</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé sur l'infrastructure <strong>Lovable Cloud</strong> (Cloudflare Workers et Supabase managed). Aucune donnée n'est stockée sur un serveur physique appartenant à l'éditeur.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>La marque, le logo et le contenu original du site sont la propriété de Nexora IPTV. Les contenus audiovisuels diffusés restent la propriété de leurs ayants droit respectifs.</p>

      <h2>Signalement</h2>
      <p>Pour tout signalement de contenu illicite ou de violation de droits, écrire à <a href="mailto:abuse@nexora-iptv.com">abuse@nexora-iptv.com</a>.</p>
    </LegalLayout>
  );
}
