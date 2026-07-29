import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapFirstAdmin, hasAnyAdmin, getMyAdminStatus, adminSignIn } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(hasAnyAdmin);
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const getStatus = useServerFn(getMyAdminStatus);
  const signInAdmin = useServerFn(adminSignIn);
  const [mode, setMode] = useState<"loading" | "login" | "bootstrap">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (s.session) {
        // Ne laisse pas une session non-admin traîner sur /admin/login.
        try {
          const r = await getStatus();
          if (r.isAdmin) {
            navigate({ to: "/admin" });
            return;
          }
          await supabase.auth.signOut();
        } catch {
          await supabase.auth.signOut();
        }
      }
      const r = await checkAdmin();
      setMode(r.exists ? "login" : "bootstrap");
    })();
  }, [checkAdmin, getStatus, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "bootstrap") {
        await bootstrap({ data: { email, password } });
        // After bootstrap, fall through to the secure admin sign-in path.
      }
      // Tokens are only issued by the server if the account has the admin role.
      const tokens = await signInAdmin({ data: { email, password } });
      const { error: setErr } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (setErr) throw setErr;
      // Defence-in-depth: re-check via the auth-middleware'd status fn.
      const status = await getStatus();
      if (!status.isAdmin) {
        await supabase.auth.signOut();
        throw new Error("Accès refusé.");
      }
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      setError(errorMessage(err) ?? "Échec de la connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {mode === "bootstrap" ? "Créer le premier admin" : "Espace administrateur"}
          </CardTitle>
          <CardDescription>
            {mode === "bootstrap"
              ? "Aucun administrateur n'existe encore. Créez le compte principal."
              : "Connectez-vous pour accéder au tableau de bord."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "loading" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" required minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "bootstrap" ? "new-password" : "current-password"} />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {mode === "bootstrap" ? "Créer le compte" : "Se connecter"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}