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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { UserCog, UserPlus, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { listEmployees, inviteEmployee, changeEmployeeRole, removeEmployee } from "@/lib/employees.functions";

export const Route = createFileRoute("/ncc/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const list = useServerFn(listEmployees);
  const invite = useServerFn(inviteEmployee);
  const change = useServerFn(changeEmployeeRole);
  const remove = useServerFn(removeEmployee);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["ncc", "employees"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const mInvite = useMutation({
    mutationFn: () => invite({ data: { email, makeAdmin: true } }),
    onSuccess: () => { toast.success(`Invitation envoyée à ${email}`); setEmail(""); setOpen(false); qc.invalidateQueries({ queryKey: ["ncc", "employees"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mChange = useMutation({
    mutationFn: (v: { id: string; action: "grant_admin" | "revoke_admin" }) => change({ data: { target_user_id: v.id, action: v.action } }),
    onSuccess: () => { toast.success("Rôle mis à jour"); qc.invalidateQueries({ queryKey: ["ncc", "employees"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const mRemove = useMutation({
    mutationFn: (id: string) => remove({ data: { target_user_id: id } }),
    onSuccess: () => { toast.success("Rôle retiré"); qc.invalidateQueries({ queryKey: ["ncc", "employees"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <NccPageHeader
        icon={UserCog}
        title="Employés"
        description="Comptes internes et administrateurs de la plateforme."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-2" /> Inviter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Inviter un administrateur</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="em">Email</Label>
                <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@nexora.com" />
                <p className="text-xs text-muted-foreground">Un email d'invitation sera envoyé et le rôle admin appliqué à la première connexion.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={() => mInvite.mutate()} disabled={!email || mInvite.isPending}>Envoyer l'invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : (q.data ?? []).map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="space-x-1">
                    {u.roles.map((r) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {u.is_admin ? (
                      <Button size="sm" variant="outline" onClick={() => mChange.mutate({ id: u.user_id, action: "revoke_admin" })} disabled={mChange.isPending}>
                        <ShieldOff className="h-3 w-3 mr-1" /> Retirer admin
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => mChange.mutate({ id: u.user_id, action: "grant_admin" })} disabled={mChange.isPending}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Promouvoir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Retirer tous les rôles de cet utilisateur ?")) mRemove.mutate(u.user_id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!q.isLoading && (q.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Aucun employé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
