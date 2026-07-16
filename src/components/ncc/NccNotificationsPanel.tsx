import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertTriangle, Info, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecentNotifications } from "@/lib/ncc.functions";

function iconFor(status: string) {
  if (status === "sent") return { Icon: CheckCircle2, color: "text-emerald-500" };
  if (status === "failed" || status === "error") return { Icon: AlertTriangle, color: "text-amber-500" };
  return { Icon: Info, color: "text-sky-500" };
}

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

export function NccNotificationsPanel({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const fn = useServerFn(listRecentNotifications);
  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "recent-notifications"],
    queryFn: () => fn(),
    enabled: open,
  });
  const items = data ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</SheetTitle>
          <SheetDescription>Aperçu des évènements récents.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune notification récente.</p>
          ) : items.map((n) => {
            const { Icon, color } = iconFor(n.status);
            const title = n.subject || `${n.channel} → ${n.recipient}`;
            const body = n.error || n.body || `Statut : ${n.status}`;
            return (
              <div key={n.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{relativeFr(n.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-6" disabled>
          Tout marquer comme lu
        </Button>
      </SheetContent>
    </Sheet>
  );
}
