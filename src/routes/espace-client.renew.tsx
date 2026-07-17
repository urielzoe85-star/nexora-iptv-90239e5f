import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalDashboard, listRenewalPlans, createRenewalOrder } from "@/lib/portal.functions";
import { COUNTRIES, type Operator } from "@/lib/countries";
import { useState } from "react";
import { RefreshCcw, Bitcoin, Smartphone, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/espace-client/renew")({
  head: () => ({
    meta: [
      { title: 'Renouveler mon abonnement — Nexora IPTV' },
      { name: "description", content: 'Renouvelez votre abonnement Nexora IPTV en quelques clics via Mobile Money ou crypto.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Renouveler mon abonnement — Nexora IPTV' },
      { property: "og:description", content: 'Renouvelez votre abonnement Nexora IPTV en quelques clics via Mobile Money ou crypto.' },
      { property: "og:url", content: 'https://nexora-iptv.com/espace-client/renew' },
    ],
    links: [{ rel: "canonical", href: 'https://nexora-iptv.com/espace-client/renew' }],
  }),
  component: RenewPage,
});

function RenewPage() {
  const router = useRouter();
  const dash = useServerFn(getPortalDashboard);
  const plansFn = useServerFn(listRenewalPlans);
  const create = useServerFn(createRenewalOrder);

  const d = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => dash() });
  const plansQ = useQuery({ queryKey: ["renewal-plans"], queryFn: () => plansFn() });

  const [planId, setPlanId] = useState<string>("");
  const [method, setMethod] = useState<"momo" | "crypto">("crypto");
  const [country, setCountry] = useState<string>(COUNTRIES[1]?.code ?? "CI");
  const [operator, setOperator] = useState<Operator>(COUNTRIES[1]?.operators[0] ?? ("MTN Mobile Money" as Operator));
  const [phone, setPhone] = useState("");
  const [cryptoCurrency, setCryptoCurrency] = useState<"USDT" | "BTC" | "ETH">("USDT");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const activeAccount = d.data?.activeSubscription;
  const plans = plansQ.data ?? [];
  const selectedPlan = plans.find((p: any) => p.id === planId);
  const countryCfg = COUNTRIES.find((c) => c.code === country);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAccount) {
      setErr("Aucun abonnement à renouveler.");
      return;
    }
    if (!selectedPlan) { setErr("Veuillez sélectionner une durée."); return; }
    setErr(""); setSubmitting(true);
    try {
      const res = await create({
        data: {
          planId: selectedPlan.id,
          accountId: activeAccount.id,
          method,
          ...(method === "momo"
            ? { phone, operator, country }
            : { crypto_currency: cryptoCurrency }),
        },
      });
      router.navigate({ to: "/espace-client/pay/$ref", params: { ref: res.orderRef } });
    } catch (e: any) {
      setErr(e?.message ?? "Impossible de créer la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  if (d.isLoading || plansQ.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <RefreshCcw className="h-7 w-7 text-[color:var(--gold)]" /> Renouveler
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prolongez votre abonnement — mêmes identifiants, expiration mise à jour automatiquement.
        </p>
      </header>

      {!activeAccount ? (
        <div className="glass rounded-2xl p-6">
          <p className="text-sm">Vous n'avez aucun abonnement actif à renouveler.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <section className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Abonnement à prolonger</div>
            <div className="text-lg font-semibold font-mono">{activeAccount.username}</div>
            <div className="text-sm text-muted-foreground">
              {activeAccount.package ?? "Nexora IPTV"} — Expire actuellement le {activeAccount.expiresAt ? new Date(activeAccount.expiresAt).toLocaleDateString("fr-FR") : "—"}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">1. Choisir la durée</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plans.map((p: any) => (
                <button
                  key={p.id} type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`rounded-xl border p-4 text-left transition ${planId === p.id ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-white/10 hover:border-white/20"}`}
                >
                  <div className="text-xs uppercase text-muted-foreground">{p.durationMonths} mois</div>
                  <div className="text-2xl font-bold mt-1">{p.price} {p.currency}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.name}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">2. Moyen de paiement</div>
            <div className="grid md:grid-cols-2 gap-3">
              <button
                type="button" onClick={() => setMethod("crypto")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${method === "crypto" ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-white/10 hover:border-white/20"}`}
              >
                <Bitcoin className="h-5 w-5 text-[color:var(--gold)] mt-0.5" />
                <div>
                  <div className="font-semibold">Binance Pay</div>
                  <div className="text-xs text-muted-foreground">Payez par QR code, envoyez la preuve.</div>
                </div>
              </button>
              <button
                type="button" onClick={() => setMethod("momo")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${method === "momo" ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-white/10 hover:border-white/20"}`}
              >
                <Smartphone className="h-5 w-5 text-[color:var(--gold)] mt-0.5" />
                <div>
                  <div className="font-semibold">Mobile Money</div>
                  <div className="text-xs text-muted-foreground">MTN, Orange, Moov, Airtel via SebPay.</div>
                </div>
              </button>
            </div>

            {method === "momo" && (
              <div className="mt-5 grid md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Pays</span>
                  <select
                    value={country}
                    onChange={(e) => {
                      const c = COUNTRIES.find((x) => x.code === e.target.value);
                      setCountry(e.target.value);
                      if (c) setOperator(c.operators[0]);
                    }}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Opérateur</span>
                  <select
                    value={operator} onChange={(e) => setOperator(e.target.value as Operator)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    {(countryCfg?.operators ?? []).map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone</span>
                  <input
                    required value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}

            {method === "crypto" && (
              <div className="mt-5">
                <label className="block max-w-xs">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Devise</span>
                  <select
                    value={cryptoCurrency} onChange={(e) => setCryptoCurrency(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {selectedPlan && <>Total : <span className="text-foreground font-semibold">{selectedPlan.price} {selectedPlan.currency}</span></>}
            </div>
            <button
              type="submit" disabled={submitting || !selectedPlan}
              className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" /> Continuer vers le paiement
            </button>
          </div>
        </form>
      )}
    </div>
  );
}