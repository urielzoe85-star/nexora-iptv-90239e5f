import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export function NccStatCard({
  label, value, delta, trend,
}: { label: string; value: string; delta?: string; trend?: "up" | "down" }) {
  const Trend = trend === "down" ? TrendingDown : TrendingUp;
  const color = trend === "down" ? "text-red-500" : "text-emerald-500";
  return (
    <Card className="border-border/60">
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-2">{value}</div>
        {delta && (
          <div className={`text-xs mt-2 flex items-center gap-1 ${color}`}>
            <Trend className="h-3 w-3" /> {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
