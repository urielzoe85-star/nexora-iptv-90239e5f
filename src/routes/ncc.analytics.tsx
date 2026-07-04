import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NccStatCard } from "@/components/ncc/NccStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Tv2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getAnalyticsSnapshot } from "@/lib/analytics.functions";

export const Route = createFileRoute("/ncc/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const fn = useServerFn(getAnalyticsSnapshot);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const q = useQuery({ queryKey: ["ncc", "analytics", days], queryFn: () => fn({ data: { days } }) });
  const d = q.data;

  return (
    <div>
      <NccPageHeader
        icon={BarChart3}
        title="Analytics"
        description="Indicateurs clés de performance."
        action={
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <NccStatCard label="Revenus" value={`${(d?.revenue ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} XOF`} />
        <NccStatCard label="Commandes payées" value={`${d?.ordersPaid ?? 0} / ${d?.ordersTotal ?? 0}`} />
        <NccStatCard label="Conversion" value={`${d?.conversion ?? 0}%`} />
        <NccStatCard label="Nouveaux clients" value={String(d?.newCustomers ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenus & commandes</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d?.series ?? []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tv2 className="h-4 w-4" /> Top plans</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.topPlans ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
            ) : (d?.topPlans ?? []).map((p) => (
              <div key={p.name} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.count} vente(s)</div>
                </div>
                <div className="text-sm font-mono">{p.revenue.toLocaleString("fr-FR")} XOF</div>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-border/40 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Panier moyen</span><span className="font-mono">{d?.aov ?? 0} XOF</span></div>
              <div className="flex justify-between"><span>Abonnements actifs</span><span className="font-mono">{d?.activeSubscriptions ?? 0}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
