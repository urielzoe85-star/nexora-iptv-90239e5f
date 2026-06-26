import { NccStatCard } from "../NccStatCard";
import { mockKpis } from "@/lib/ncc/mock-dashboard";

export function DashboardKpis() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {mockKpis.map((k) => <NccStatCard key={k.label} {...k} />)}
    </div>
  );
}
