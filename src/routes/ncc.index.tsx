import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NccStatCard } from "@/components/ncc/NccStatCard";
import { DashboardRevenueChart } from "@/components/ncc/modules/DashboardRevenueChart";
import { DashboardActivityFeed } from "@/components/ncc/modules/DashboardActivityFeed";
import { LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardKpis } from "@/lib/ncc.functions";
import { fmtMoney } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/")({
  component: NccDashboard,
});

function NccDashboard() {
  const fn = useServerFn(getDashboardKpis);
  const { data, isLoading } = useQuery({ queryKey: ["ncc", "kpis"], queryFn: () => fn() });
  return (
    <div className="space-y-6">
      <NccPageHeader
        icon={LayoutDashboard}
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NccStatCard label="Revenus"             value={isLoading ? "…" : fmtMoney(data?.revenue_total ?? 0, data?.revenue_currency ?? "USD")} />
        <NccStatCard label="Clients actifs"      value={isLoading ? "…" : String(data?.customers_active ?? 0)} />
        <NccStatCard label="Commandes (24h)"     value={isLoading ? "…" : String(data?.orders_24h ?? 0)} />
        <NccStatCard label="Abonnements actifs"  value={isLoading ? "…" : String(data?.subscriptions_active ?? 0)} />
        <NccStatCard label="Commandes totales"   value={isLoading ? "…" : String(data?.orders_total ?? 0)} />
        <NccStatCard label="Produits actifs"     value={isLoading ? "…" : String(data?.products_active ?? 0)} />
        <NccStatCard label="Essais en cours"     value={isLoading ? "…" : String(data?.trials_active ?? 0)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><DashboardRevenueChart /></div>
        <DashboardActivityFeed />
      </div>
    </div>
  );
}
