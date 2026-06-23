import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check, Lock, ShieldCheck, ChevronLeft, Mail, User,
  Loader2, Tv, Phone, Globe, Smartphone, ExternalLink, Clock,
} from "lucide-react";
import { createOrder } from "@/lib/orders.functions";
import { initSebPayCheckout, verifyPayment } from "@/lib/payments.functions";
import { useT, LanguageSwitcher } from "@/i18n/context";

type Plan = { id: string; name: string; price: number; period: string; save?: string; popular?: boolean };

type Operator = "MTN Mobile Money" | "Orange Money";
const OPERATORS: Operator[] = ["MTN Mobile Money", "Orange Money"];
const COUNTRIES: { code: string; label: string }[] = [
  { code: "BJ", label: "Bénin (BJ)" },
  { code: "CI", label: "Côte d'Ivoire (CI)" },
  { code: "SN", label: "Sénégal (SN)" },
  { code: "TG", label: "Togo (TG)" },
  { code: "BF", label: "Burkina Faso (BF)" },
  { code: "ML", label: "Mali (ML)" },
  { code: "NE", label: "Niger (NE)" },
  { code: "CM", label: "Cameroun (CM)" },
];
const USD_TO_XOF = 600;
const SEBPAY_ENDPOINT = "https://newapi.sebpay.bj/api/v1/collections";

const PLANS: Plan[] = [
  { id: "1m",  name: "1 Month",   price: 12, period: "/month" },
  { id: "3m",  name: "3 Months",  price: 30, period: "/quarter",   save: "Save 17%" },
  { id: "6m",  name: "6 Months",  price: 55, period: "/6 months",  save: "Save 24%" },
  { id: "12m", name: "12 Months", price: 95, period: "/year",      save: "Save 34%", popular: true },
];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Nexora IPTV" },
      { name: "description", content: "Paiement Mobile Money sécurisé via SebPay (MTN / Orange) pour votre abonnement Nexora IPTV." },
      { property: "og:title", content: "Checkout — Nexora IPTV" },
      { property: "og:description", content: "Paiement Mobile Money sécurisé via SebPay (MTN / Orange) pour votre abonnement Nexora IPTV." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  component: CheckoutPage,
});

type PendingState = {
  orderRef: string;
  transactionId: string;
  providerLink: string | null;
  message: string | null;
};

function CheckoutPage() {
  const t = useT();
  const { plan: planParam } = Route.useSearch();
  const initial = useMemo(() => {
    const match = PLANS.find(p => p.name.toLowerCase() === (planParam ?? "").toLowerCase());
    return match ?? PLANS[3];
  }, [planParam]);

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Plan>(initial);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator>("MTN Mobile Money");
  const [country, setCountry] = useState("BJ");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [pending, setPending] = useState<PendingState | null>(null);

  const taxes = 0;
  const total = +(selected.price + taxes).toFixed(2);

  const canPay =
    email.includes("@") &&
    fullName.trim().length > 1 &&
    phone.replace(/\D/g, "").length >= 8 &&
    !!operator && !!country;

  // Live preview of the SebPay payload that will be sent server-side. Mirrors
  // exactly what src/lib/payments.functions.ts builds for the documented
  // POST /api/v1/collections endpoint.
  const sebpayPayloadPreview = useMemo(() => ({
    amount: Math.round(total * USD_TO_XOF),
    currency: "XOF",
    phone: phone || "+229XXXXXXXX",
    operator,
    country,
    external_reference: "NX-…",
    callback_url: "{origin}/api/public/sebpay/webhook",
  }), [total, phone, operator, country]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay) return;
    setErrorMsg("");
    setProcessing(true);
    try {
      const order = await createOrder({
        data: {
          email: email.toLowerCase(),
          fullName,
          planId: selected.id,
          planName: selected.name,
          amount: total,
          currency: "USD",
          method: "momo",
          phone, operator, country,
        },
      });
      if (!order?.order_ref) throw new Error("Could not create order");

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await initSebPayCheckout({
        data: {
          ref: order.order_ref,
          successUrl: `${origin}/payment/success?ref=${order.order_ref}`,
          failureUrl: `${origin}/payment/failed?ref=${order.order_ref}`,
        },
      });
      console.log("[checkout] sebpay collection", result);

      // If SebPay returns a provider_link, open it in a new tab so the
      // customer can complete the payment on the operator's page.
      if (result.providerLink && typeof window !== "undefined") {
        window.open(result.providerLink, "_blank", "noopener,noreferrer");
      }

      setPending({
        orderRef: order.order_ref,
        transactionId: result.transactionId,
        providerLink: result.providerLink,
        message: result.message,
      });
    } catch (err: any) {
      console.error("[checkout] payment init failed", err);
      setErrorMsg(err?.message ?? t("co.err.generic"));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center">
              <Tv className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold tracking-wide">NEXORA <span className="text-[color:var(--gold)]">IPTV</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              {t("co.secure")}
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {pending ? (
          <PendingPanel pending={pending} />
        ) : (
          <>
            <Stepper step={step} />
            <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-8">
              <div className="space-y-6">
                {step === 1 && (
                  <PlanStep
                    selected={selected}
                    onSelect={setSelected}
                    onNext={() => setStep(2)}
                  />
                )}
                {step === 2 && (
                  <PaymentStep
                    email={email} setEmail={setEmail}
                    fullName={fullName} setFullName={setFullName}
                    phone={phone} setPhone={setPhone}
                    operator={operator} setOperator={setOperator}
                    country={country} setCountry={setCountry}
                    processing={processing}
                    canPay={canPay}
                    total={total}
                    errorMsg={errorMsg}
                    payloadPreview={sebpayPayloadPreview}
                    onBack={() => setStep(1)}
                    onSubmit={handlePay}
                  />
                )}
              </div>
              <OrderSummary plan={selected} taxes={taxes} total={total} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const t = useT();
  const items = [t("co.step.plan"), t("co.step.payment"), t("co.step.confirm")];
  return (
    <ol className="flex items-center gap-3 text-sm">
      {items.map((label, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const active = idx === step;
        const done = idx < step;
        return (
          <li key={label} className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full grid place-items-center font-semibold text-xs transition
              ${done ? "bg-[image:var(--gradient-gold)] text-black"
                    : active ? "border border-[color:var(--gold)] text-[color:var(--gold)]"
                             : "border border-white/10 text-muted-foreground"}`}>
              {done ? <Check className="h-4 w-4" /> : idx}
            </div>
            <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            {i < items.length - 1 && <span className="w-10 h-px bg-white/10 mx-1" />}
          </li>
        );
      })}
    </ol>
  );
}

function PlanStep({ selected, onSelect, onNext }: { selected: Plan; onSelect: (p: Plan) => void; onNext: () => void }) {
  const t = useT();
  const planLabels: Record<string, { name: string; period: string; save?: string }> = {
    "1m":  { name: t("pricing.month"),    period: t("pricing.per.month") },
    "3m":  { name: t("pricing.3months"),  period: t("pricing.per.quarter"), save: t("pricing.save17") },
    "6m":  { name: t("pricing.6months"),  period: t("pricing.per.6"),       save: t("pricing.save24") },
    "12m": { name: t("pricing.12months"), period: t("pricing.per.year"),    save: t("pricing.save34") },
  };
  const includes = [1, 2, 3, 4, 5, 6].map((i) => t(`co.includes.${i}`));
  return (
    <section className="glass rounded-2xl p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-1">{t("co.select.title")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("co.select.sub")}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {PLANS.map(p => {
          const active = p.id === selected.id;
          const lbl = planLabels[p.id] ?? { name: p.name, period: p.period, save: p.save };
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={`relative text-left rounded-xl p-5 transition border ${active
                ? "border-[color:var(--gold)] bg-white/[0.04] shadow-[var(--shadow-gold)]"
                : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
            >
              {p.popular && (
                <span className="absolute -top-2 right-4 bg-[image:var(--gradient-gold)] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {t("pricing.popular")}
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{lbl.name}</span>
                <span className={`h-5 w-5 rounded-full border grid place-items-center ${active ? "border-[color:var(--gold)]" : "border-white/20"}`}>
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--gold)]" />}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gradient-gold">${p.price}</span>
                <span className="text-xs text-muted-foreground">{lbl.period}</span>
              </div>
              {lbl.save && <p className="text-xs text-[color:var(--gold)] mt-1">{lbl.save}</p>}
            </button>
          );
        })}
      </div>

      <ul className="grid sm:grid-cols-2 gap-2 mt-6 text-sm">
        {includes.map(f => (
          <li key={f} className="flex items-start gap-2 text-muted-foreground">
            <Check className="h-4 w-4 text-[color:var(--gold)] mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>

      <button onClick={onNext} className="btn-gold btn-gold-hover mt-8 w-full sm:w-auto px-8 py-3 rounded-full font-semibold">
        {t("co.continue")}
      </button>
    </section>
  );
}

function PaymentStep(props: {
  email: string; setEmail: (v: string) => void;
  fullName: string; setFullName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  operator: Operator; setOperator: (v: Operator) => void;
  country: string; setCountry: (v: string) => void;
  processing: boolean; canPay: boolean; total: number; errorMsg?: string;
  payloadPreview: Record<string, any>;
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useT();
  const {
    email, setEmail, fullName, setFullName,
    phone, setPhone, operator, setOperator, country, setCountry,
    processing, canPay, total, errorMsg, payloadPreview, onBack, onSubmit,
  } = props;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="glass rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">{t("co.details")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field icon={<User className="h-4 w-4" />} label="Nom complet">
            <input
              required value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </Field>
          <Field icon={<Mail className="h-4 w-4" />} label="Adresse email">
            <input
              required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </Field>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Paiement Mobile Money</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> SebPay
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Le paiement est traité par SebPay. Vous recevrez une demande de confirmation
            sur votre téléphone (MTN ou Orange Money).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field icon={<Smartphone className="h-4 w-4" />} label="Opérateur Mobile Money">
              <select
                required value={operator}
                onChange={(e) => setOperator(e.target.value as Operator)}
                className="w-full bg-transparent outline-none text-sm"
              >
                {OPERATORS.map((o) => (
                  <option key={o} value={o} className="bg-background">{o}</option>
                ))}
              </select>
            </Field>
            <Field icon={<Globe className="h-4 w-4" />} label="Pays">
              <select
                required value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-background">{c.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field icon={<Phone className="h-4 w-4" />} label="Numéro Mobile Money">
            <input
              required type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+22996XXXXXXX"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </Field>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Endpoint SebPay
              </span>
              <span className="text-[11px] text-[color:var(--gold)]">POST</span>
            </div>
            <code className="block text-xs font-mono text-foreground/90 break-all mb-3">
              {SEBPAY_ENDPOINT}
            </code>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Payload envoyé (côté serveur)
            </span>
            <pre className="mt-1 text-[11px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(payloadPreview, null, 2)}
            </pre>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              Headers: <span className="font-mono">X-Public-Key</span> + <span className="font-mono">X-Secret-Key</span> (jamais exposés au navigateur).
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-4">
          Paiement traité par <span className="text-foreground">SebPay</span>. Aucune validation automatique — la commande passe en « Paiement confirmé » uniquement après confirmation SebPay.
        </p>
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 whitespace-pre-wrap break-words">
          <div className="font-semibold mb-1">SebPay error</div>
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> {t("co.back")}
        </button>
        <button
          type="submit"
          disabled={!canPay || processing}
          className="btn-gold btn-gold-hover px-8 py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t("co.processing")}</>)
                      : (<><Lock className="h-4 w-4" /> Payer ${total.toFixed(2)}</>)}
        </button>
      </div>
    </form>
  );
}

function PendingPanel({ pending }: { pending: PendingState }) {
  const [status, setStatus] = useState<string>("processing");
  const [tries, setTries] = useState(0);

  // Poll SebPay (server-side, GET /api/v1/collections/{id}) every 4s for
  // up to ~3min. We never mark "paid" client-side — verifyPayment talks to
  // SebPay and updates the DB only when SebPay confirms.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      while (!cancelled && attempts < 45) {
        attempts++;
        setTries(attempts);
        try {
          const v = await verifyPayment({ data: { ref: pending.orderRef } });
          if (cancelled) return;
          setStatus(v.status);
          if (v.status === "paid") {
            window.location.href = `/payment/success?ref=${pending.orderRef}`;
            return;
          }
          if (v.status === "failed" || v.status === "cancelled") {
            window.location.href = `/payment/failed?ref=${pending.orderRef}`;
            return;
          }
        } catch (e) {
          console.error("[checkout] verify error", e);
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [pending.orderRef]);

  return (
    <section className="max-w-2xl mx-auto glass rounded-2xl p-8 md:p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/40 grid place-items-center mb-5">
        <Clock className="h-7 w-7 text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Paiement en attente</h1>
      <p className="text-muted-foreground mb-6">
        Confirmez la transaction sur votre téléphone ({pending.message ?? "USSD / page opérateur"}).
        Cette page se met à jour automatiquement.
      </p>

      <div className="text-left mx-auto max-w-md rounded-xl border border-white/10 divide-y divide-white/5 mb-6">
        <Row label="Référence commande" value={<span className="font-mono">{pending.orderRef}</span>} />
        <Row label="Transaction SebPay" value={<span className="font-mono text-xs">{pending.transactionId}</span>} />
        <Row label="Statut" value={<span className="text-amber-400">{status}</span>} />
        <Row label="Vérifications" value={`${tries} / 45`} />
      </div>

      {pending.providerLink && (
        <a
          href={pending.providerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass hover:border-[color:var(--gold)]/40 transition text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4 text-[color:var(--gold)]" />
          Ouvrir la page opérateur
        </a>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Aucun paiement n'est validé tant que SebPay n'a pas confirmé via webhook
        ou via <span className="font-mono">GET /api/v1/collections/{"{id}"}</span>.
      </p>
    </section>
  );
}

function OrderSummary({ plan, taxes, total }: { plan: Plan; taxes: number; total: number }) {
  const t = useT();
  const planNameMap: Record<string, string> = {
    "1m": t("pricing.month"), "3m": t("pricing.3months"),
    "6m": t("pricing.6months"), "12m": t("pricing.12months"),
  };
  const planName = planNameMap[plan.id] ?? plan.name;
  const xof = Math.round(total * USD_TO_XOF);
  return (
    <aside className="glass rounded-2xl p-6 h-fit lg:sticky lg:top-24">
      <h3 className="text-sm uppercase tracking-[0.18em] text-[color:var(--gold)] mb-4">{t("co.summary")}</h3>
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <p className="font-semibold">Nexora IPTV — {planName}</p>
          <p className="text-xs text-muted-foreground">{t("co.summary.premium")}</p>
        </div>
        <p className="font-semibold">${plan.price.toFixed(2)}</p>
      </div>
      <dl className="space-y-2 py-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><dt>{t("co.summary.subtotal")}</dt><dd>${plan.price.toFixed(2)}</dd></div>
        <div className="flex justify-between text-muted-foreground"><dt>{t("co.summary.taxes")}</dt><dd>${taxes.toFixed(2)}</dd></div>
      </dl>
      <div className="flex justify-between items-baseline pt-4 border-t border-white/10">
        <span className="text-sm text-muted-foreground">{t("co.summary.total")}</span>
        <span className="text-2xl font-bold text-gradient-gold">${total.toFixed(2)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-right">
        Débité : <span className="font-mono">{xof.toLocaleString()} XOF</span>
      </p>
      <div className="mt-6 space-y-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> {t("co.guarantee")}</p>
        <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-[color:var(--gold)]" /> {t("co.encrypted")}</p>
        <p className="flex items-center gap-2"><Check className="h-4 w-4 text-[color:var(--gold)]" /> {t("co.instant")}</p>
      </div>
    </aside>
  );
}

function Field({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 focus-within:border-[color:var(--gold)]/60 transition">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {children}
      </div>
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}