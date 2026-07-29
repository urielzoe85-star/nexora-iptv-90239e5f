import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, verifyNccAccess } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, DollarSign, Clock, TrendingUp, Loader2, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
import { errorMessage } from "@/lib/error-message";
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fn() });

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const kpis = [
    { label: "Commandes (30j)", value: data.ordersTotal, icon: ShoppingBag },
    { label: "Aujourd'hui", value: data.ordersToday, icon: Clock },
    { label: "Revenu (30j)", value: `$${data.revenue.toFixed(2)}`, icon: DollarSign },
    { label: "Conversion", value: `${data.conversion}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Activité des 30 derniers jours.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{k.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <NccAccessCard />

      <Card>
        <CardHeader><CardTitle>Revenu quotidien</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
                tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commandes en attente</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.pending}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Commandes en attente de paiement ou de traitement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NccAccessCard() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyNccAccess);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await verify({ data: { password } });
      if (!r.ok) {
        setError("Mot de passe incorrect.");
        return;
      }
      setOpen(false);
      setPassword("");
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      navigate({ to: "/ncc", replace: true });
    } catch (err: unknown) {
      setError(errorMessage(err) ?? "Erreur de vérification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Nexora Control Center
          </CardTitle>
          <CardDescription>
            Accès au centre de contrôle avancé (NCC). Protégé par un mot de passe dédié.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPassword(""); setError(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <KeyRound className="h-4 w-4 mr-2" /> Accéder au NCC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vérification d'accès NCC</DialogTitle>
              <DialogDescription>
                Entrez le mot de passe dédié au Nexora Control Center.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ncc-pwd">Mot de passe NCC</Label>
                <Input
                  id="ncc-pwd"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Déverrouiller
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
    </Card>
  );
}