import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Activity, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { megaottStatus, megaottPing } from "@/lib/iptv-megaott.functions";
import { MegaottSubscriptionForm } from "./MegaottSubscriptionForm";

export function MegaottPanel() {
  const qc = useQueryClient();
  const status = useServerFn(megaottStatus);
  const ping = useServerFn(megaottPing);

  const s = useQuery({ queryKey: ["megaott", "status"], queryFn: () => status() });
  const mPing = useMutation({
    mutationFn: () => ping({ data: {} }),
    onSuccess: (r: any) => {
      if (r.ok) toast.success(`MEGAOTT joignable (HTTP ${r.status}, ${r.durationMs}ms)`);
      else toast.error(`Échec ping MEGAOTT: ${r.error}`);
      qc.invalidateQueries({ queryKey: ["megaott"] });
    },
  });

  const ready = s.data?.ready && s.data?.providerConfigured;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          MEGAOTT — Intégration native (via Integration Hub)
        </CardTitle>
        {ready
          ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Prêt</Badge>
          : <Badge variant="outline" className="border-amber-500/40 text-amber-700"><XCircle className="h-3 w-3 mr-1" /> Configuration requise</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Bearer Token</div>
            <div>{s.data?.tokenConfigured ? <span className="text-emerald-600">Configuré (secret serveur)</span> : <span className="text-rose-600">Manquant — MEGAOTT_BEARER_TOKEN</span>}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Fournisseur</div>
            <div className="truncate">{s.data?.providerConfigured ? <span className="text-emerald-600">{s.data?.apiUrl}</span> : <span className="text-rose-600">Aucun fournisseur MEGAOTT trouvé</span>}</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Créez (ou renommez) un fournisseur ayant <code>name</code> contenant « megaott » ou <code>metadata.kind = "megaott"</code>, et renseignez l'URL API.
          Toutes les communications passent par l'Integration Hub (timeout / retry / rate-limit / logs centralisés).
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => mPing.mutate()} disabled={!s.data?.tokenConfigured || !s.data?.providerConfigured || mPing.isPending}>
            <Activity className="h-3 w-3 mr-1" /> Tester la connexion
          </Button>
          <MegaottSubscriptionForm disabled={!ready} />
        </div>
      </CardContent>
    </Card>
  );
}