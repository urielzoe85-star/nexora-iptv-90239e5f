import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardOverview } from "@/lib/ncc.functions";

export function DashboardRevenueChart() {
  const fn = useServerFn(getDashboardOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "dashboard-overview"],
    queryFn: () => fn(),
  });
  const series = data?.series ?? [];
  const empty = !isLoading && series.every((p) => !p.revenue);
  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-base">Revenu — 30 derniers jours</CardTitle></CardHeader>
      <CardContent className="h-72">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />
        ) : empty ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Aucun revenu sur la période.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="nccRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
              tickFormatter={(d) => String(d).slice(5)} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#nccRev)" />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
