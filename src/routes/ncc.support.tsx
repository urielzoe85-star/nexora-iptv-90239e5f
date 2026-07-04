import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Plus, Send } from "lucide-react";
import {
  adminListTickets, adminGetTicket, adminCreateTicket, adminReplyTicket, adminUpdateTicket,
} from "@/lib/support.functions";

export const Route = createFileRoute("/ncc/support")({ component: SupportPage });

const prioColor: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-500",
  normal: "bg-sky-500/15 text-sky-500",
  high: "bg-amber-500/15 text-amber-500",
  urgent: "bg-red-500/15 text-red-500",
};
const statusColor: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-500",
  pending: "bg-amber-500/15 text-amber-500",
  resolved: "bg-sky-500/15 text-sky-500",
  closed: "bg-slate-500/15 text-slate-500",
};

function SupportPage() {
  const listFn = useServerFn(adminListTickets);
  const getFn = useServerFn(adminGetTicket);
  const createFn = useServerFn(adminCreateTicket);
  const replyFn = useServerFn(adminReplyTicket);
  const updateFn = useServerFn(adminUpdateTicket);
  const qc = useQueryClient();

  const [status, setStatus] = useState<"all" | "open" | "pending" | "resolved" | "closed">("all");
  const [priority, setPriority] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [openNew, setOpenNew] = useState(false);
  const [nEmail, setNEmail] = useState("");
  const [nSubject, setNSubject] = useState("");
  const [nBody, setNBody] = useState("");
  const [nPriority, setNPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");

  const [reply, setReply] = useState("");

  const q = useQuery({
    queryKey: ["support", "list", status, priority, search],
    queryFn: () => listFn({ data: { status, priority, search: search || undefined, limit: 100 } }),
  });

  const qTicket = useQuery({
    queryKey: ["support", "ticket", selected],
    queryFn: () => getFn({ data: { id: selected! } }),
    enabled: !!selected,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["support"] });
  };

  const mCreate = useMutation({
    mutationFn: () => createFn({ data: { email: nEmail, subject: nSubject, body: nBody, priority: nPriority } }),
    onSuccess: () => { toast.success("Ticket créé"); setOpenNew(false); setNEmail(""); setNSubject(""); setNBody(""); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mReply = useMutation({
    mutationFn: (newStatus?: "pending" | "resolved") => replyFn({ data: { ticket_id: selected!, body: reply, newStatus } }),
    onSuccess: () => { toast.success("Réponse envoyée"); setReply(""); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mUpdate = useMutation({
    mutationFn: (patch: any) => updateFn({ data: { id: selected!, ...patch } }),
    onSuccess: () => { toast.success("Ticket mis à jour"); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <NccPageHeader
        icon={LifeBuoy}
        title="Support"
        description="Tickets et helpdesk client."
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nouveau ticket</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un ticket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Email client</Label><Input type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} /></div>
                <div><Label>Sujet</Label><Input value={nSubject} onChange={(e) => setNSubject(e.target.value)} /></div>
                <div><Label>Priorité</Label>
                  <Select value={nPriority} onValueChange={(v) => setNPriority(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Message initial</Label><Textarea rows={5} value={nBody} onChange={(e) => setNBody(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>Annuler</Button>
                <Button onClick={() => mCreate.mutate()} disabled={!nEmail || !nSubject || !nBody || mCreate.isPending}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Recherche email ou sujet…" className="flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="open">Ouverts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
                <SelectItem value="closed">Clos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
                <SelectItem value="normal">Normale</SelectItem>
                <SelectItem value="low">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sujet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>MàJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (q.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Aucun ticket.</TableCell></TableRow>
              ) : (q.data ?? []).map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(t.id)}>
                  <TableCell className="font-medium max-w-md truncate">{t.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.email}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor[t.status]}>{t.status}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={prioColor[t.priority]}>{t.priority}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleString("fr-FR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{qTicket.data?.ticket.subject ?? "Ticket"}</SheetTitle></SheetHeader>
          {qTicket.data && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className={statusColor[qTicket.data.ticket.status]}>{qTicket.data.ticket.status}</Badge>
                <Badge variant="outline" className={prioColor[qTicket.data.ticket.priority]}>{qTicket.data.ticket.priority}</Badge>
                <span className="text-xs text-muted-foreground">{qTicket.data.ticket.email}</span>
              </div>

              <div className="flex gap-2">
                <Select value={qTicket.data.ticket.status} onValueChange={(v) => mUpdate.mutate({ status: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="closed">Clos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={qTicket.data.ticket.priority} onValueChange={(v) => mUpdate.mutate({ priority: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                {qTicket.data.messages.map((m: any) => (
                  <div key={m.id} className={`text-sm ${m.author_type === "admin" ? "text-right" : ""}`}>
                    <div className={`inline-block max-w-[85%] p-3 rounded-lg ${m.author_type === "admin" ? "bg-primary/15" : "bg-card border border-border/60"}`}>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        {m.author_type} · {new Date(m.created_at).toLocaleString("fr-FR")}
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Répondre</Label>
                <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre réponse…" />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => mReply.mutate("resolved")} disabled={!reply || mReply.isPending}>Répondre + marquer résolu</Button>
                  <Button onClick={() => mReply.mutate(undefined)} disabled={!reply || mReply.isPending}>
                    <Send className="h-4 w-4 mr-2" /> Envoyer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
