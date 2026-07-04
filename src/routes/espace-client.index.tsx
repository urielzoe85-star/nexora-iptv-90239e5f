import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { requestPortalOtp, verifyPortalOtp } from "@/lib/portal.functions";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/espace-client/")({
  component: PortalLogin,
});

function PortalLogin() {
  const router = useRouter();
  const request = useServerFn(requestPortalOtp);
  const verify = useServerFn(verifyPortalOtp);
  const [step, setStep] = useState<"identify" | "code">("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [emailMasked, setEmailMasked] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await request({ data: { identifier: identifier.trim() } });
      if (!res.ok) {
        setErr("Trop de codes envoyés récemment. Réessayez dans une heure.");
      } else {
        setEmailMasked(res.emailMasked);
        setStep("code");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Impossible d'envoyer le code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await verify({ data: { identifier: identifier.trim(), code: code.trim() } });
      router.navigate({ to: "/espace-client/dashboard" });
    } catch (e: any) {
      setErr(e?.message ?? "Code invalide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center mb-4">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold">Espace client</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Accédez à votre abonnement, renouvelez-le et gérez votre compte.
          </p>
        </div>

        {step === "identify" && (
          <form onSubmit={handleRequest} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                E-mail, numéro de commande ou identifiant IPTV
              </span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  required autoFocus autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="exemple@mail.com  ·  NX-XXXX  ·  nx_abcd"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit" disabled={loading || identifier.trim().length < 3}
              className="w-full btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Recevoir mon code
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Un code de vérification à 6 chiffres vous sera envoyé par e-mail.
            </p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Nous avons envoyé un code à{" "}
              <span className="text-foreground font-medium">{emailMasked ?? "votre adresse"}</span>.
            </p>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Code à 6 chiffres
              </span>
              <input
                required autoFocus inputMode="numeric" pattern="\d{6}" maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="••••••"
              />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit" disabled={loading || code.length !== 6}
              className="w-full btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Vérifier et me connecter
            </button>
            <button
              type="button"
              onClick={() => { setStep("identify"); setCode(""); setErr(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Utiliser un autre identifiant
            </button>
          </form>
        )}
      </div>
    </section>
  );
}