import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe — Nexora IPTV" },
      { name: "description", content: "Unsubscribe from Nexora IPTV email notifications." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const [state, setState] = useState<"loading" | "valid" | "done" | "already" | "invalid" | "error">("loading");
  const [busy, setBusy] = useState(false);

  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token") ?? ""
    : "";

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.valid) setState("valid");
        else if (d?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d?.success) setState("done");
      else if (d?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch { setState("error"); }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="max-w-md w-full overflow-hidden rounded-2xl border bg-card text-center shadow-lg">
        <div className="bg-[#0B1220] px-6 py-6">
          <p className="text-[#D4AF37] text-xl font-bold tracking-[0.14em]">NEXORA IPTV</p>
          <p className="mt-1 text-[11px] tracking-wider text-slate-300">Votre abonnement IPTV premium</p>
        </div>
        <div className="h-1 w-full bg-[#D4AF37]" />
        <div className="p-8 space-y-4">
        <h1 className="text-xl font-semibold">Désabonnement</h1>
        {state === "loading" && <p className="text-muted-foreground text-sm">Vérification du lien…</p>}
        {state === "valid" && (
          <>
            <p className="text-sm text-muted-foreground">
              Confirmez-vous votre désabonnement aux emails Nexora IPTV ? Vous continuerez
              à recevoir les emails essentiels liés à votre compte (sécurité, connexion).
            </p>
            <button
              onClick={confirm}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >{busy ? "…" : "Confirmer le désabonnement"}</button>
          </>
        )}
        {state === "done" && <p className="text-emerald-600 text-sm">Vous êtes désabonné. Vous ne recevrez plus nos emails commerciaux.</p>}
        {state === "already" && <p className="text-muted-foreground text-sm">Cette adresse est déjà désabonnée.</p>}
        {state === "invalid" && <p className="text-red-600 text-sm">Lien invalide ou expiré.</p>}
        {state === "error" && <p className="text-red-600 text-sm">Une erreur est survenue. Réessayez plus tard.</p>}
        <a href="https://nexora-iptv.com" className="inline-block text-xs text-muted-foreground underline">
          Retour sur nexora-iptv.com
        </a>
        </div>
      </div>
    </div>
  );
}