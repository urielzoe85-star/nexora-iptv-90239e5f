import { createFileRoute, useRouter, useSearch, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { resetPortalPassword } from "@/lib/portal.functions";
import { PORTAL_BASE_URL } from "@/lib/portal-url";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { errorMessage } from "@/lib/error-message";

const search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/espace-client/reset-password")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Nexora IPTV" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre Espace Client Nexora IPTV." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: `${PORTAL_BASE_URL}/espace-client/reset-password` },
    ],
    links: [{ rel: "canonical", href: `${PORTAL_BASE_URL}/espace-client/reset-password` }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = useSearch({ from: "/espace-client/reset-password" });
  const router = useRouter();
  const reset = useServerFn(resetPortalPassword);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!token) { setErr("Lien invalide."); return; }
    if (pwd !== pwd2) { setErr("Les deux mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      await reset({ data: { token, password: pwd } });
      router.navigate({ to: "/espace-client/dashboard" });
    } catch (e: unknown) {
      setErr(errorMessage(e) ?? "Impossible de réinitialiser.");
    } finally { setLoading(false); }
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center mb-4">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choisissez un mot de passe d'au moins 8 caractères, incluant lettres et chiffres.
          </p>
        </div>

        {!token ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive">Ce lien est invalide ou incomplet.</p>
            <Link to="/espace-client" className="text-sm underline text-muted-foreground">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input required type="password" autoComplete="new-password" minLength={8}
                  value={pwd} onChange={(e) => setPwd(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Confirmer</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input required type="password" autoComplete="new-password" minLength={8}
                  value={pwd2} onChange={(e) => setPwd2(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm" />
              </div>
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button type="submit" disabled={loading || pwd.length < 8}
              className="w-full btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer et me connecter
            </button>
          </form>
        )}
      </div>
    </section>
  );
}