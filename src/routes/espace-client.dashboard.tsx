import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalDashboard } from "@/lib/portal.functions";
import { RefreshCcw, Calendar, Zap, ShoppingBag, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/espace-client/dashboard")({
  component: DashboardPage,
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function DashboardPage() {
  const router = useRouter();
  const dashboard = useServerFn(getPortalDashboard);
  const q = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => dashboard() });
  const [showUsername, setShowUsername] = useState(false);

  useEffect(() => {
    if (q.error) router.navigate({ to: "/espace-client" });
  }, [q.error, router]);

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (!q.data) return null;

  const { customer, activeSubscription: sub, subscriptions, orders, announcements } = q.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour {customer?.full_name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voici l'état de votre abonnement Nexora IPTV.
        </p>
      </header>

      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a: any) => (
            <div key={a.id} className="glass rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-[color:var(--gold)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="glass rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Abonnement actif</div>
            {sub ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{sub.package ?? "Nexora IPTV"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === "active" || sub.status === "delivered" || sub.status === "assigned" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {sub.status === "active" || sub.status === "delivered" || sub.status === "assigned" ? "Actif" : sub.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Expire le <span className="text-foreground font-medium">{fmtDate(sub.expiresAt)}</span></div>
                  <div className="flex items-center gap-2"><Zap className="h-4 w-4" /> <span className="text-foreground font-medium">{sub.daysLeft ?? "—"} jours restants</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Identifiant IPTV :</span>
                    <span className="font-mono text-foreground">{showUsername ? sub.username : "••••••••"}</span>
                    <button onClick={() => setShowUsername((v) => !v)} className="text-muted-foreground hover:text-foreground">
                      {showUsername ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">Aucun abonnement actif</div>
                <p className="text-sm text-muted-foreground mt-1">Vous n'avez pas encore d'abonnement Nexora IPTV.</p>
              </>
            )}
          </div>
          <Link
            to="/espace-client/renew"
            className="btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" /> Renouveler mon abonnement
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Historique des commandes</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Référence</th>
                  <th className="text-left px-4 py-3">Offre</th>
                  <th className="text-left px-4 py-3">Montant</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.slice(0, 10).map((o: any) => (
                  <tr key={o.order_ref}>
                    <td className="px-4 py-3 font-mono text-xs">{o.order_ref}</td>
                    <td className="px-4 py-3">{o.plan_name}</td>
                    <td className="px-4 py-3 font-mono">{money(Number(o.amount), o.currency)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/track" search={{ ref: o.order_ref } as any} className="text-xs text-[color:var(--gold)] hover:underline">
                        Détails →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <Link to="/espace-client/orders" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" /> Voir toutes les commandes
          </Link>
        </div>
      </section>

      {subscriptions.length > 1 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Mes abonnements</h2>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Identifiant</th>
                  <th className="text-left px-4 py-3">Offre</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Expire le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono">{s.username}</td>
                    <td className="px-4 py-3">{s.package ?? "—"}</td>
                    <td className="px-4 py-3">{s.status}</td>
                    <td className="px-4 py-3">{fmtDate(s.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    completed: { label: "Payé", cls: "bg-emerald-500/15 text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    paid: { label: "Payé", cls: "bg-emerald-500/15 text-emerald-400" },
    processing: { label: "En cours", cls: "bg-amber-500/15 text-amber-400" },
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-400" },
    failed: { label: "Échoué", cls: "bg-red-500/15 text-red-400" },
    cancelled: { label: "Annulé", cls: "bg-white/10 text-muted-foreground" },
    refunded: { label: "Remboursé", cls: "bg-white/10 text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-white/10 text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}