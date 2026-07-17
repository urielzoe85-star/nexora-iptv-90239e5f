import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  requestPortalOtp,
  verifyPortalOtp,
  loginPortalPassword,
  registerPortalAccount,
  requestPortalPasswordReset,
} from "@/lib/portal.functions";
import { PORTAL_BASE_URL } from "@/lib/portal-url";
import { Mail, ShieldCheck, Loader2, Lock, UserPlus, KeyRound } from "lucide-react";

export const Route = createFileRoute("/espace-client/")({
  head: () => ({
    meta: [
      { title: 'Connexion Espace Client — Nexora IPTV' },
      { name: "description", content: 'Connectez-vous à votre espace client Nexora IPTV pour gérer votre abonnement et vos accès.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Connexion Espace Client — Nexora IPTV' },
      { property: "og:description", content: 'Connectez-vous à votre espace client Nexora IPTV pour gérer votre abonnement et vos accès.' },
      { property: "og:url", content: `${PORTAL_BASE_URL}/espace-client` },
    ],
    links: [{ rel: "canonical", href: `${PORTAL_BASE_URL}/espace-client` }],
  }),
  component: PortalLogin,
});

function PortalLogin() {
  const router = useRouter();
  const request = useServerFn(requestPortalOtp);
  const verify = useServerFn(verifyPortalOtp);
  const loginPwd = useServerFn(loginPortalPassword);
  const register = useServerFn(registerPortalAccount);
  const forgot = useServerFn(requestPortalPasswordReset);

  type Tab = "login" | "register" | "otp";
  const [tab, setTab] = useState<Tab>("login");

  // Shared state
  const [err, setErr] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Password login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regEmail, setRegEmail] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regPwd2, setRegPwd2] = useState("");

  // OTP flow
  const [step, setStep] = useState<"identify" | "code">("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [emailMasked, setEmailMasked] = useState<string | null>(null);

  function switchTab(t: Tab) {
    setTab(t); setErr(""); setInfo("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    try {
      await loginPwd({ data: { email: loginEmail.trim(), password: loginPassword } });
      router.navigate({ to: "/espace-client/dashboard" });
    } catch (e: any) {
      setErr(e?.message ?? "Connexion impossible.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    if (regPwd !== regPwd2) {
      setErr("Les deux mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }
    try {
      await register({ data: { email: regEmail.trim(), password: regPwd } });
      router.navigate({ to: "/espace-client/dashboard" });
    } catch (e: any) {
      setErr(e?.message ?? "Impossible de créer le compte.");
    } finally { setLoading(false); }
  }

  async function handleForgot() {
    setErr(""); setInfo("");
    const email = loginEmail.trim();
    if (!email) { setErr("Entrez votre e-mail pour recevoir le lien."); return; }
    setLoading(true);
    try {
      await forgot({ data: { email } });
      setInfo("Si un compte correspond à cet e-mail, un lien de réinitialisation vient d'être envoyé.");
    } catch (e: any) {
      setErr(e?.message ?? "Impossible d'envoyer le lien.");
    } finally { setLoading(false); }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setInfo("");
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
    setErr(""); setInfo("");
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

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-6 text-xs">
          <button type="button" onClick={() => switchTab("login")}
            className={`px-2 py-2 rounded-lg font-medium inline-flex items-center justify-center gap-1 ${tab === "login" ? "bg-[color:var(--gold)]/20 text-foreground" : "text-muted-foreground"}`}>
            <Lock className="h-3.5 w-3.5" /> Connexion
          </button>
          <button type="button" onClick={() => switchTab("register")}
            className={`px-2 py-2 rounded-lg font-medium inline-flex items-center justify-center gap-1 ${tab === "register" ? "bg-[color:var(--gold)]/20 text-foreground" : "text-muted-foreground"}`}>
            <UserPlus className="h-3.5 w-3.5" /> Créer
          </button>
          <button type="button" onClick={() => switchTab("otp")}
            className={`px-2 py-2 rounded-lg font-medium inline-flex items-center justify-center gap-1 ${tab === "otp" ? "bg-[color:var(--gold)]/20 text-foreground" : "text-muted-foreground"}`}>
            <KeyRound className="h-3.5 w-3.5" /> Code e-mail
          </button>
        </div>

        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input required type="email" autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="exemple@mail.com"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Mot de passe</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input required type="password" autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {info && <p className="text-sm text-emerald-400">{info}</p>}
            <button type="submit" disabled={loading || !loginEmail || !loginPassword}
              className="w-full btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
            <button type="button" onClick={handleForgot}
              className="w-full text-xs text-muted-foreground hover:text-foreground">
              Mot de passe oublié ?
            </button>
          </form>
        )}

        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Utilisez l'e-mail indiqué lors de votre commande. Nous lions votre mot de passe à votre compte client existant.
            </p>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input required type="email" autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="exemple@mail.com"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Mot de passe</span>
              <input required type="password" autoComplete="new-password" minLength={8}
                value={regPwd}
                onChange={(e) => setRegPwd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Au moins 8 caractères, incluant lettres et chiffres.
              </span>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Confirmer</span>
              <input required type="password" autoComplete="new-password" minLength={8}
                value={regPwd2}
                onChange={(e) => setRegPwd2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button type="submit" disabled={loading || !regEmail || regPwd.length < 8}
              className="w-full btn-gold btn-gold-hover px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer mon compte
            </button>
          </form>
        )}

        {tab === "otp" && step === "identify" && (
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

        {tab === "otp" && step === "code" && (
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