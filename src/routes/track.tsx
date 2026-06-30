import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Tv, Search, Loader2, CheckCircle2, Circle, AlertTriangle, RefreshCw,
  CreditCard, ShieldCheck, Mail, Server,
} from "lucide-react";
import { getOrderByRef } from "@/lib/orders.functions";
import { verifyPayment } from "@/lib/payments.functions";
import { useT, LanguageSwitcher } from "@/i18n/context";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Nexora IPTV" },
      { name: "description", content: "Real-time payment and activation status for your Nexora IPTV subscription." },
      { property: "og:title", content: "Track Your Order — Nexora IPTV" },
      { property: "og:description", content: "Live payment and activation status for your Nexora IPTV order." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/track" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : "",
  }),
  component: TrackPage,
});

type Order = {
  order_ref: string;
  email: string;
  full_name: string;
  plan_name: string;
  amount: number;
  currency: string;
  method: string;
  status: "pending" | "processing" | "paid" | "completed" | "failed" | "cancelled" | string;
  sebpay_reference: string | null;
  created_at: string;
  updated_at: string;
  delivery?: {
    status: "pending" | "ready_to_send" | "sent" | string;
    sent_channel: "email" | "whatsapp" | "telegram" | null;
    sent_at: string | null;
  } | null;
};

// Fenêtre d'activation visuelle après confirmation du paiement (ms).
// L'admin valide manuellement, puis 1 min plus tard l'étape « identifiants
// envoyés » se valide côté client.
const ACTIVATION_MS = 60 * 1000;

// Statuts considérés comme "paiement confirmé" pour le timeline.
function isConfirmed(s: string) {
  return s === "paid" || s === "completed";
}

function TrackPage() {
  const t = useT();
  const { ref: initialRef } = Route.useSearch();
  const [ref, setRef] = useState(initialRef ?? "");
  const [input, setInput] = useState(initialRef ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  // Tick every second for elapsed-time UI.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Initial + polling fetch.
  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    let tickCount = 0;

    // Lecture rapide de la commande (utilisée pour le temps réel).
    async function fetchOnce(opts: { verify?: boolean } = {}) {
      if (opts.verify) {
        // Re-vérifie auprès de SebPay (source de vérité). Coûteux : on ne le
        // fait qu'à intervalles espacés, pas à chaque tick temps réel.
        await verifyPayment({ data: { ref } }).catch(() => null);
      }
      const o = await getOrderByRef({ data: { ref } }).catch(() => null);
      if (cancelled) return;
      setLastChecked(Date.now());
      if (!o) { setOrder(null); setNotFound(true); return; }
      setNotFound(false);
      setOrder(o as Order);
    }

    setLoading(true);
    fetchOnce({ verify: true }).finally(() => { if (!cancelled) setLoading(false); });

    // Poll quasi temps réel toutes les 1.2 s tant que la commande n'est
    // pas dans un état terminal et que la fenêtre d'activation est ouverte.
    // Re-vérification SebPay une fois sur 5 (~6 s) pour limiter la charge.
    const id = setInterval(() => {
      const status = order?.status;
      const inActivation =
        !!status && isConfirmed(status) &&
        Date.now() - new Date(order!.updated_at).getTime() < ACTIVATION_MS;
      if (status === "failed" || status === "cancelled") return; // terminal
      if (status && isConfirmed(status) && !inActivation) return; // fully activated
      tickCount += 1;
      fetchOnce({ verify: tickCount % 5 === 0 });
    }, 1200);

    // Refetch immédiat quand l'onglet redevient visible / reçoit le focus.
    function onFocus() {
      if (document.visibilityState === "visible") fetchOnce();
    }
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, order?.status, order?.updated_at]);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim().toUpperCase();
    if (!v) return;
    setOrder(null);
    setNotFound(false);
    setRef(v);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{t("track.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("track.sub")}</p>

        <form
          onSubmit={handleLookup}
          className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="flex items-center gap-2 flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="NX-XXXXXXXXXX"
              className="w-full bg-transparent outline-none text-sm font-mono uppercase tracking-wider placeholder:text-muted-foreground/50"
            />
          </div>
          <button type="submit" className="btn-gold btn-gold-hover px-6 py-2 rounded-full text-sm font-semibold">
            {t("track.lookup")}
          </button>
        </form>

        {!ref && (
          <p className="text-sm text-muted-foreground">{t("track.empty")}</p>
        )}

        {ref && loading && !order && (
          <div className="glass rounded-2xl p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[color:var(--gold)] mb-3" />
            <p className="text-sm text-muted-foreground">{t("track.loading")}</p>
          </div>
        )}

        {ref && notFound && (
          <div className="glass rounded-2xl p-10 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-muted-foreground">{t("track.notFound")}</p>
          </div>
        )}

        {order && <TrackView order={order} now={now} lastChecked={lastChecked} />}
      </div>
    </main>
  );
}

function TrackView({ order, now, lastChecked }: { order: Order; now: number; lastChecked: number | null }) {
  const t = useT();
  const paidAt = isConfirmed(order.status) ? new Date(order.updated_at).getTime() : null;
  const elapsedSincePaid = paidAt ? Math.max(0, now - paidAt) : 0;
  // L'étape "compte créé" se valide quand un abonnement IPTV est rattaché
  // à la commande (delivery.status présent), avec fallback temporel pour
  // les commandes anciennes/legacy sans champ delivery.
  const provisioned =
    !!order.delivery && order.delivery.status !== "pending"
      ? true
      : paidAt
        ? elapsedSincePaid >= ACTIVATION_MS
        : false;
  // L'étape "identifiants envoyés" se valide UNIQUEMENT quand l'admin
  // (ou l'automatisation) a marqué la livraison comme envoyée.
  const delivered = order.delivery?.status === "sent";
  const activationPct = delivered
    ? 100
    : provisioned
      ? 66
      : paidAt
        ? Math.min(60, Math.round((elapsedSincePaid / ACTIVATION_MS) * 60))
        : 0;

  // Compute step states.
  type StepState = "done" | "active" | "pending" | "failed";
  const s = order.status;
  const steps: { key: string; icon: React.ReactNode; label: string; desc: string; state: StepState }[] = [
    {
      key: "placed",
      icon: <CreditCard className="h-4 w-4" />,
      label: t("track.step.placed"),
      desc: t("track.step.placed.desc"),
      state: "done",
    },
    {
      key: "auth",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: t("track.step.auth"),
      desc: t("track.step.auth.desc"),
      state:
        s === "pending" ? "active" :
        s === "failed" || s === "cancelled" ? "failed" :
        "done",
    },
    {
      key: "confirmed",
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t("track.step.confirmed"),
      desc: t("track.step.confirmed.desc"),
      state:
        isConfirmed(s) ? "done" :
        s === "processing" ? "active" :
        s === "failed" || s === "cancelled" ? "failed" :
        "pending",
    },
    {
      key: "provision",
      icon: <Server className="h-4 w-4" />,
      label: t("track.step.provision"),
      desc: t("track.step.provision.desc"),
      state:
        provisioned ? "done" :
        isConfirmed(s) ? "active" :
        "pending",
    },
    {
      key: "delivered",
      icon: <Mail className="h-4 w-4" />,
      label: t("track.step.delivered"),
      desc: t("track.step.delivered.desc"),
      state:
        delivered ? "done" :
        provisioned ? "active" :
        "pending",
    },
  ];

  const terminal = s === "failed" || s === "cancelled";
  const polling = !terminal && !delivered;

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <section className="glass rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--gold)] mb-2">
              {t("track.order")}
            </p>
            <h2 className="text-2xl font-bold font-mono">{order.order_ref}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {order.plan_name} · ${Number(order.amount).toFixed(2)} {order.currency}
            </p>
          </div>
          <StatusBadge status={s} />
        </div>

        {/* Live indicator */}
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            {polling ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t("track.live")}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                {t("track.stopped")}
              </>
            )}
          </span>
          {lastChecked && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {t("track.lastChecked")}: {new Date(lastChecked).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Activation progress bar (only meaningful when paid/completed) */}
        {isConfirmed(s) && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">{t("track.activation")}</span>
              <span className="text-[color:var(--gold)] font-medium">{activationPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[image:var(--gradient-gold)] transition-[width] duration-700 ease-out"
                style={{ width: `${activationPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {delivered ? t("track.activation.done") : t("track.activation.eta")}
            </p>
          </div>
        )}

        {terminal && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {t("track.terminal")}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="glass rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-semibold mb-6">{t("track.timeline")}</h3>
        <ol className="relative space-y-6">
          {steps.map((step, i) => (
            <li key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`h-9 w-9 rounded-full grid place-items-center border transition
                  ${step.state === "done" ? "bg-[image:var(--gradient-gold)] text-black border-transparent"
                    : step.state === "active" ? "border-[color:var(--gold)] text-[color:var(--gold)] bg-[color:var(--gold)]/5"
                    : step.state === "failed" ? "border-red-500/40 text-red-400 bg-red-500/10"
                    : "border-white/10 text-muted-foreground bg-white/[0.02]"}`}>
                  {step.state === "done" ? <CheckCircle2 className="h-4 w-4" />
                    : step.state === "active" ? <Loader2 className="h-4 w-4 animate-spin" />
                    : step.state === "failed" ? <AlertTriangle className="h-4 w-4" />
                    : <Circle className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-px flex-1 mt-2 mb-[-1.5rem] ${step.state === "done" ? "bg-[color:var(--gold)]/40" : "bg-white/10"}`} />
                )}
              </div>
              <div className="pb-2">
                <p className={`font-medium ${step.state === "pending" ? "text-muted-foreground" : ""}`}>
                  <span className="inline-flex items-center gap-2">{step.icon}{step.label}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Details */}
      <section className="glass rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-semibold mb-4">{t("track.details")}</h3>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label={t("ok.row.plan")} value={order.plan_name} />
          <DetailRow label={t("ok.row.amount")} value={`$${Number(order.amount).toFixed(2)} ${order.currency}`} />
          <DetailRow label={t("ok.row.method")} value={order.method.toUpperCase()} />
          <DetailRow label={t("ok.row.email")} value={order.email} />
          <DetailRow label={t("track.placedAt")} value={new Date(order.created_at).toLocaleString()} />
          {order.sebpay_reference && (
            <DetailRow label={t("ok.row.ref")} value={<span className="font-mono text-xs break-all">{order.sebpay_reference}</span>} />
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="px-5 py-2 rounded-full glass hover:border-[color:var(--gold)]/40 transition text-xs font-medium">
            {t("ok.home")}
          </Link>
          <Link to="/dashboard" search={{ email: order.email }} className="px-5 py-2 rounded-full glass hover:border-[color:var(--gold)]/40 transition text-xs font-medium">
            {t("ok.orders")}
          </Link>
          {terminal && (
            <Link to="/checkout" search={{ plan: undefined }} className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-xs font-semibold">
              {t("fail.retry")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    processing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    cancelled: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  };
  const cls = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${cls}`}>
      {t(`status.${status}`)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function Header() {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center">
            <Tv className="h-4 w-4 text-black" />
          </div>
          <span className="font-bold tracking-wide">NEXORA <span className="text-[color:var(--gold)]">IPTV</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/dashboard" search={{ email: "" }} className="text-xs text-muted-foreground hover:text-foreground transition">
            {t("dash.title")}
          </Link>
        </div>
      </div>
    </header>
  );
}