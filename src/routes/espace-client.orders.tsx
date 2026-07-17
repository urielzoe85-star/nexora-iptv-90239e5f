import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalOrders } from "@/lib/portal.functions";

export const Route = createFileRoute("/espace-client/orders")({
  head: () => ({
    meta: [
      { title: 'Mes commandes — Espace Client Nexora' },
      { name: "description", content: 'Historique et statut de vos commandes et paiements Nexora IPTV.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Mes commandes — Espace Client Nexora' },
      { property: "og:description", content: 'Historique et statut de vos commandes et paiements Nexora IPTV.' },
      { property: "og:url", content: 'https://nexora-iptv.com/espace-client/orders' },
    ],
    links: [{ rel: "canonical", href: 'https://nexora-iptv.com/espace-client/orders' }],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const fn = useServerFn(getPortalOrders);
  const q = useQuery({ queryKey: ["portal-orders"], queryFn: () => fn() });
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Commandes & paiements</h1>
        <p className="text-sm text-muted-foreground mt-1">Historique complet de vos commandes et paiements.</p>
      </header>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.data && q.data.length === 0 && <p className="text-sm text-muted-foreground">Aucune commande.</p>}
      {q.data && q.data.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Référence</th>
                <th className="text-left px-4 py-3">Offre</th>
                <th className="text-left px-4 py-3">Méthode</th>
                <th className="text-left px-4 py-3">Montant</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Date</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {q.data.map((o: any) => (
                <tr key={o.order_ref}>
                  <td className="px-4 py-3 font-mono text-xs">{o.order_ref}</td>
                  <td className="px-4 py-3">{o.plan_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.method ?? "—"}</td>
                  <td className="px-4 py-3 font-mono">{Number(o.amount).toFixed(2)} {o.currency}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/track" search={{ ref: o.order_ref } as any} className="text-xs text-[color:var(--gold)] hover:underline">Détails →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}