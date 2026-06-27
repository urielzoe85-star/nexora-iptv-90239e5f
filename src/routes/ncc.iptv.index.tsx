import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { iptvDashboard } from "@/lib/iptv.functions";
import {
  Activity, PackageOpen, Gift, AlertTriangle, CalendarClock, CalendarRange, Sparkles, RefreshCcw,
} from "lucide-react";

export const Route = createFileRoute("/ncc/iptv/")({ component: IptvDashboard });

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function IptvDashboard() {
  const fn = useServerFn(iptvDashboard);
  const { data } = useQuery({ queryKey: ["iptv", "dashboard"], queryFn: () => fn() });
  const k = data ?? {
    available: 0, active: 0, trials_remaining: 0, suspended: 0,
    expiring_today: 0, expiring_week: 0, new_premium_7d: 0, renewals_7d: 0,
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi icon={PackageOpen} label="Comptes disponibles" value={k.available} />
      <Kpi icon={Activity}    label="Comptes actifs"      value={k.active} />
      <Kpi icon={Gift}        label="Essais restants"     value={k.trials_remaining} />
      <Kpi icon={AlertTriangle} label="Comptes suspendus" value={k.suspended} />
      <Kpi icon={CalendarClock} label="Expirent aujourd'hui" value={k.expiring_today} />
      <Kpi icon={CalendarRange} label="Expirent cette semaine" value={k.expiring_week} />
      <Kpi icon={Sparkles}    label="Nouveaux Premium (7j)" value={k.new_premium_7d} />
      <Kpi icon={RefreshCcw}  label="Renouvellements (7j)"  value={k.renewals_7d} />
    </div>
  );
}