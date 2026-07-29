import { errorMessage } from "@/lib/error-message";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, CheckCircle2, XCircle, Image as ImageIcon, RefreshCw, Loader2 } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";
import {
  listBinanceAwaiting,
  approveBinancePayment,
  rejectBinancePayment,
  getBinanceProofScreenshotUrl,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/ncc/payments/binance")({
  component: BinancePaymentsPage,
});

function BinancePaymentsPage() {
  const list = useServerFn(listBinanceAwaiting);
  const approve = useServerFn(approveBinancePayment);
  const reject = useServerFn(rejectBinancePayment);
  const getShot = useServerFn(getBinanceProofScreenshotUrl);
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["ncc", "payments", "binance", "awaiting"],
    queryFn: () => list(),
    staleTime: 15_000,
  });

  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [rejectRef, setRejectRef] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotFor, setScreenshotFor] = useState<string | null>(null);

  async function handleApprove(ref: string) {
    if (!confirm(`Valider le paiement Binance ${ref} et déclencher la livraison IPTV ?`)) return;
    setBusyRef(ref);
    try {
      await approve({ data: { ref } });
      await qc.invalidateQueries({ queryKey: ["ncc", "payments", "binance", "awaiting"] });
    } catch (e: unknown) {
      alert(`Approbation impossible : ${errorMessage(e) ?? e}`);
    } finally {
      setBusyRef(null);
    }
  }

  async function handleReject() {
    if (!rejectRef || rejectReason.trim().length < 2) return;
    setBusyRef(rejectRef);
    try {
      await reject({ data: { ref: rejectRef, reason: rejectReason.trim() } });
      setRejectRef(null); setRejectReason("");
      await qc.invalidateQueries({ queryKey: ["ncc", "payments", "binance", "awaiting"] });
    } catch (e: unknown) {
      alert(`Refus impossible : ${errorMessage(e) ?? e}`);
    } finally {
      setBusyRef(null);
    }
  }

  async function handleShowScreenshot(ref: string) {
    setScreenshotFor(ref);
    setScreenshotUrl(null);
    try {
      const { url } = await getShot({ data: { ref } });
      setScreenshotUrl(url);
    } catch (e: unknown) {
      alert(`Impossible d'ouvrir la capture : ${errorMessage(e) ?? e}`);
      setScreenshotFor(null);
    }
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <NccPageHeader
        icon={CreditCard}
        title="Paiements Binance"
        description="Vérification manuelle des paiements Binance Pay (QR statique). La livraison IPTV se déclenche uniquement après validation."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Chargement…" : `${rows.length} paiement(s) en attente de vérification`}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Compte Binance</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>TXID</TableHead>
                  <TableHead>Capture</TableHead>
                  <TableHead>Soumis</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                      Aucun paiement Binance en attente pour le moment.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.order_ref}>
                    <TableCell className="font-mono text-xs">{r.order_ref}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.plan_name}</TableCell>
                    <TableCell className="text-sm">{fmtMoney(r.amount, r.currency)}</TableCell>
                    <TableCell className="text-sm">{r.account_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs font-mono">{r.binance_uid ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[180px] truncate" title={r.transaction_id ?? ""}>
                      {r.transaction_id ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.screenshot_path ? (
                        <Button variant="ghost" size="sm" onClick={() => handleShowScreenshot(r.order_ref)}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{r.submitted_at ? fmtDate(r.submitted_at) : "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(r.order_ref)}
                        disabled={busyRef === r.order_ref || r.status !== "awaiting_verification"}
                      >
                        {busyRef === r.order_ref ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Valider
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => { setRejectRef(r.order_ref); setRejectReason(""); }}
                        disabled={busyRef === r.order_ref}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Refuser
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!rejectRef} onOpenChange={(o) => { if (!o) { setRejectRef(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le paiement Binance</DialogTitle>
            <DialogDescription>
              Commande <span className="font-mono">{rejectRef}</span>. Le client sera notifié
              du refus par email et la commande passera au statut « failed ».
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motif du refus (visible dans le journal, communiqué au client)"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectRef(null); setRejectReason(""); }}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectReason.trim().length < 2 || busyRef === rejectRef}
            >
              {busyRef === rejectRef ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!screenshotFor} onOpenChange={(o) => { if (!o) { setScreenshotFor(null); setScreenshotUrl(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Capture — {screenshotFor}</DialogTitle>
            <DialogDescription>URL signée valable 5 minutes.</DialogDescription>
          </DialogHeader>
          <div className="min-h-[300px] grid place-items-center">
            {!screenshotUrl ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <img src={screenshotUrl} alt={`Preuve Binance ${screenshotFor}`} className="max-h-[70vh] rounded-lg border border-border/60" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}