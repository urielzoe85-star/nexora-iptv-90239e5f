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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border rounded-xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Désabonnement Nexora IPTV</h1>
        {state === "loading" && <p className="text-muted-foreground text-sm">Vérification du lien…</p>}
        {state === "valid" && (
          <>
            <p className="text-sm">Confirmez-vous votre désabonnement aux emails Nexora IPTV ?</p>
            <button
              onClick={confirm}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >{busy ? "…" : "Confirmer le désabonnement"}</button>
          </>
        )}
        {state === "done" && <p className="text-emerald-600 text-sm">Vous êtes désabonné. Vous ne recevrez plus d'emails.</p>}
        {state === "already" && <p className="text-muted-foreground text-sm">Cette adresse est déjà désabonnée.</p>}
        {state === "invalid" && <p className="text-red-600 text-sm">Lien invalide ou expiré.</p>}
        {state === "error" && <p className="text-red-600 text-sm">Une erreur est survenue. Réessayez plus tard.</p>}
      </div>
    </div>
  );
}