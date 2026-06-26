import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const mockNotifs = [
  { id: 1, icon: CheckCircle2, color: "text-emerald-500", title: "Paiement reçu", body: "Commande #ORD-2934 confirmée via SebPay.", when: "il y a 5 min" },
  { id: 2, icon: AlertTriangle, color: "text-amber-500", title: "Ligne IPTV expirée", body: "3 lignes à renouveler dans les 48h.", when: "il y a 1 h" },
  { id: 3, icon: Info, color: "text-sky-500", title: "Nouvelle mise à jour", body: "Le module Analytics est en préparation.", when: "hier" },
];

export function NccNotificationsPanel({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</SheetTitle>
          <SheetDescription>Aperçu des évènements récents (démo).</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {mockNotifs.map((n) => (
            <div key={n.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
              <n.icon className={`h-5 w-5 shrink-0 mt-0.5 ${n.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.body}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{n.when}</div>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-6" disabled>
          Tout marquer comme lu
        </Button>
      </SheetContent>
    </Sheet>
  );
}
