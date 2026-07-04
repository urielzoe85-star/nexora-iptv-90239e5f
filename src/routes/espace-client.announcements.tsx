import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalAnnouncements } from "@/lib/portal.functions";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/espace-client/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const fn = useServerFn(getPortalAnnouncements);
  const q = useQuery({ queryKey: ["portal-announcements"], queryFn: () => fn() });
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Annonces</h1>
        <p className="text-sm text-muted-foreground mt-1">Actualités et informations importantes.</p>
      </header>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.data && q.data.length === 0 && <p className="text-sm text-muted-foreground">Aucune annonce.</p>}
      {q.data && q.data.map((a: any) => (
        <div key={a.id} className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-[color:var(--gold)]" />
            <h2 className="font-semibold">{a.title}</h2>
            <span className="text-xs text-muted-foreground ml-auto">{new Date(a.published_at).toLocaleDateString("fr-FR")}</span>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</div>
        </div>
      ))}
    </div>
  );
}