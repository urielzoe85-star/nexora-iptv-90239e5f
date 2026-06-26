import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockActivity } from "@/lib/ncc/mock-dashboard";
import { ShoppingBag, CreditCard, LifeBuoy, Bot, Tv2, Gift } from "lucide-react";

const ICONS = {
  order: ShoppingBag, payment: CreditCard, support: LifeBuoy,
  bot: Bot, iptv: Tv2, trial: Gift,
};

export function DashboardActivityFeed() {
  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-base">Activité récente</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {mockActivity.map((a) => {
            const Icon = ICONS[a.kind];
            return (
              <li key={a.id} className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-muted grid place-items-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><span className="font-medium">{a.who}</span> {a.what}</div>
                  <div className="text-xs text-muted-foreground">{a.when}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
