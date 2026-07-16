import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, CreditCard, LifeBuoy, Tv2, Gift, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardOverview } from "@/lib/ncc.functions";

const ICONS = {
  order: ShoppingBag, payment: CreditCard, support: LifeBuoy,
  iptv: Tv2, trial: Gift, customer: User,
} as const;

function relativeFr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function DashboardActivityFeed() {
  const fn = useServerFn(getDashboardOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "dashboard-overview"],
    queryFn: () => fn(),
  });
  const items = data?.activity ?? [];
  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-base">Activité récente</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => {
              const Icon = ICONS[a.kind] ?? ShoppingBag;
              return (
                <li key={a.id} className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-muted grid place-items-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm"><span className="font-medium">{a.who}</span> {a.what}</div>
                    <div className="text-xs text-muted-foreground">{relativeFr(a.when)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
