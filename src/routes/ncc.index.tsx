import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { DashboardKpis } from "@/components/ncc/modules/DashboardKpis";
import { DashboardRevenueChart } from "@/components/ncc/modules/DashboardRevenueChart";
import { DashboardActivityFeed } from "@/components/ncc/modules/DashboardActivityFeed";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LayoutDashboard, Info } from "lucide-react";

export const Route = createFileRoute("/ncc/")({
  component: NccDashboard,
});

function NccDashboard() {
  return (
    <div className="space-y-6">
      <NccPageHeader
        icon={LayoutDashboard}
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme."
      />
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-xs">
          Données de démonstration — les métriques réelles seront branchées dans une prochaine phase.
        </AlertDescription>
      </Alert>
      <DashboardKpis />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><DashboardRevenueChart /></div>
        <DashboardActivityFeed />
      </div>
    </div>
  );
}
