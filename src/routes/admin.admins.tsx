import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListAdmins, adminAddAdmin, adminRemoveAdmin } from "@/lib/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/admins")({ component: AdminsPage });

function AdminsPage() {
  const list = useServerFn(adminListAdmins);
  const add = useServerFn(adminAddAdmin);
  const remove = useServerFn(adminRemoveAdmin);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<{ user_id: string; email: string | null } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "admins"], queryFn: () => list() });

  async function doAdd() {
    setSubmitting(true);
    try {
      await add({ data: { email, password } });
      toast.success("Administrateur ajouté");
      setAdding(false); setEmail(""); setPassword("");
      qc.invalidateQueries({ queryKey: ["admin", "admins"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setSubmitting(false); }
  }

  async function doRemove() {
    if (!deleting) return;
    try {
      await remove({ data: { user_id: deleting.user_id } });
      toast.success("Administrateur retiré");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin", "admins"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Administrateurs</h1>
          <p className="text-sm text-muted-foreground">Gérez qui peut accéder au tableau de bord.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data || data.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Aucun administrateur.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ajouté le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a: any) => (
                  <TableRow key={a.user_id}>
                    <TableCell className="text-sm">{a.email ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost"
                        onClick={() => setDeleting({ user_id: a.user_id, email: a.email })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel administrateur</DialogTitle>
            <DialogDescription>
              Si l'email correspond à un compte existant, il sera promu admin.
              Sinon, un compte sera créé avec le mot de passe fourni.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mot de passe (min. 8)</Label>
              <Input type="password" minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Annuler</Button>
            <Button onClick={doAdd} disabled={submitting || !email || password.length < 8}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet administrateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleting?.email}</strong> perdra l'accès au tableau de bord. Le compte utilisateur reste actif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doRemove}>Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}