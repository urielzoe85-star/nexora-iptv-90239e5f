import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalOrderStatus, getPortalDashboard } from "@/lib/portal.functions";
import { CheckCircle2, Calendar, Zap } from "lucide-react";

export const Route = createFileRoute("/espace-client/success/$ref")({
  component: SuccessPage,
});

function SuccessPage() {
  const { ref } = Route.useParams();
  const status = useServerFn(getPortalOrderStatus);
  const dash = useServerFn(getPortalDashboard);
  const oq = useQuery({
    queryKey: ["portal-order", ref],
    queryFn: () => status({ data: { orderRef: ref } }),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "completed" || s === "paid" ? false : 4000;
    },
  });
  const dq = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => dash() });

  const sub = dq.data?.activeSubscription;
  const o = oq.data;

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6 py-8">
      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 grid place-items-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">Renouvellement confirmé</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Merci ! Votre abonnement Nexora IPTV a été prolongé — vos identifiants restent inchangés.
        </p>
      </div>
      <div className="glass rounded-2xl p-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Référence de paiement</span>
          <span className="font-mono">{ref}</span>
        </div>
        {o && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Offre</span>
            <span>{o.plan_name}</span>
          </div>
        )}
        {sub && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> Nouvelle expiration</span>
              <span className="font-medium">
                {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("fr-FR") : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1"><Zap className="h-4 w-4" /> Jours restants</span>
              <span className="font-medium">{sub.daysLeft ?? "—"}</span>
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Un e-mail de confirmation vous a été envoyé.
      </p>
      <div>
        <Link to="/espace-client/dashboard" className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold inline-flex">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}