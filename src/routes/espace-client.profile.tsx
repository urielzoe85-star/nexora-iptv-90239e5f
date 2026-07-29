import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPortalDashboard, updatePortalProfile, changePortalPassword } from "@/lib/portal.functions";
import { PORTAL_BASE_URL } from "@/lib/portal-url";
import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { Loader2, CheckCircle2, Lock } from "lucide-react";
import { errorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/espace-client/profile")({
  head: () => ({
    meta: [
      { title: 'Mon profil — Espace Client Nexora' },
      { name: "description", content: 'Mettez à jour vos coordonnées, votre pays et vos préférences de contact.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Mon profil — Espace Client Nexora' },
      { property: "og:description", content: 'Mettez à jour vos coordonnées, votre pays et vos préférences de contact.' },
      { property: "og:url", content: `${PORTAL_BASE_URL}/espace-client/profile` },
    ],
    links: [{ rel: "canonical", href: `${PORTAL_BASE_URL}/espace-client/profile` }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const dash = useServerFn(getPortalDashboard);
  const update = useServerFn(updatePortalProfile);
  const changePwd = useServerFn(changePortalPassword);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => dash() });
  const c = q.data?.customer;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (c) {
      setFullName(c.full_name ?? "");
      setPhone(c.phone ?? "");
      setCountry(c.country ?? "");
    }
  }, [c?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSaved(false); setSaving(true);
    try {
      await update({ data: { fullName, phone, country } });
      await qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
      setSaved(true);
    } catch (e: unknown) {
      setErr(errorMessage(e) ?? "Impossible de sauvegarder.");
    } finally { setSaving(false); }
  }

  // Password section
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdErr, setPwdErr] = useState("");

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdErr(""); setPwdSaved(false);
    if (newPwd !== newPwd2) { setPwdErr("Les deux mots de passe ne correspondent pas."); return; }
    setPwdSaving(true);
    try {
      await changePwd({ data: { currentPassword: currentPwd, newPassword: newPwd } });
      setPwdSaved(true);
      setCurrentPwd(""); setNewPwd(""); setNewPwd2("");
    } catch (e: unknown) {
      setPwdErr(errorMessage(e) ?? "Impossible de modifier le mot de passe.");
    } finally { setPwdSaving(false); }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Ces informations servent à la facturation et à la livraison.</p>
      </header>
      {q.isLoading || !c ? <p className="text-sm text-muted-foreground">Chargement…</p> : (
        <>
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</span>
            <input value={c.email} disabled
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Nom complet</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Pays</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <option value="">— Non renseigné —</option>
              {COUNTRIES.map((co) => (
                <option key={co.code} value={co.code}>{co.label}</option>
              ))}
            </select>
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {saved && <p className="text-sm text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Enregistré.</p>}
          <button type="submit" disabled={saving}
            className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </form>

        <form onSubmit={submitPassword} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Lock className="h-4 w-4" /> Sécurité — mot de passe</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Laissez « Mot de passe actuel » vide si vous n'en aviez pas encore défini.
            </p>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Mot de passe actuel</span>
            <input type="password" autoComplete="current-password"
              value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</span>
            <input required type="password" autoComplete="new-password" minLength={8}
              value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Au moins 8 caractères, incluant lettres et chiffres.
            </span>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Confirmer</span>
            <input required type="password" autoComplete="new-password" minLength={8}
              value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </label>
          {pwdErr && <p className="text-sm text-destructive">{pwdErr}</p>}
          {pwdSaved && <p className="text-sm text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Mot de passe mis à jour.</p>}
          <button type="submit" disabled={pwdSaving || newPwd.length < 8}
            className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            {pwdSaving && <Loader2 className="h-4 w-4 animate-spin" />} Mettre à jour le mot de passe
          </button>
        </form>
        </>
      )}
    </div>
  );
}