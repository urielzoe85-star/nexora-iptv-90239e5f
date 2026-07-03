import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check, Lock, ShieldCheck, ChevronLeft, Mail, User,
  Loader2, Tv, Phone, Globe, Smartphone, ExternalLink, Clock, Bitcoin,
} from "lucide-react";
import { createOrder } from "@/lib/orders.functions";
import { LEGAL_VERSION } from "@/lib/legal-version";
import { initSebPayCheckout, verifyPayment, initBinancePayCheckout, verifyBinancePayPayment } from "@/lib/payments.functions";
import { useT, LanguageSwitcher } from "@/i18n/context";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPlans, type PublicPlan } from "@/lib/plans.functions";
import { COUNTRIES, getCountry, convertUsdToLocal, type Operator } from "@/lib/countries";

type Plan = { id: string; slug: string; name: string; price: number; period: string; save?: string; popular?: boolean };

function toPlan(p: PublicPlan): Plan {
  return {
    id: p.slug,
    slug: p.slug,
    name: p.name,
    price: p.price,
    period: p.period_label,
    save: p.save_label ?? undefined,
    popular: p.popular,
  };
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Nexora IPTV" },
      { name: "description", content: "Paiement Mobile Money sécurisé via SebPay (MTN / Orange) pour votre abonnement Nexora IPTV." },
      { property: "og:title", content: "Checkout — Nexora IPTV" },
      { property: "og:description", content: "Paiement Mobile Money sécurisé via SebPay (MTN / Orange) pour votre abonnement Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/checkout" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/checkout" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  component: CheckoutPage,
});

type PendingState = {
  orderRef: string;
  transactionId: string;
  providerLink: string | null;
  message: string | null;
  provider: "sebpay" | "binance_pay";
  qrcodeLink?: string | null;
};

function CheckoutPage() {
  const t = useT();
  const { plan: planParam } = Route.useSearch();
  const fetchPlans = useServerFn(getPublicPlans);
  const { data: rawPlans = [] } = useQuery<PublicPlan[]>({
    queryKey: ["public-plans"],
    queryFn: () => fetchPlans(),
    staleTime: 30_000,
  });
  const plans = useMemo(() => rawPlans.map(toPlan), [rawPlans]);

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Plan | null>(null);
  useEffect(() => {
    if (plans.length === 0) return;
    setSelected((cur) => {
      if (cur && plans.find((p) => p.slug === cur.slug)) return cur;
      const match = plans.find(
        (p) =>
          p.slug.toLowerCase() === (planParam ?? "").toLowerCase() ||
          p.name.toLowerCase() === (planParam ?? "").toLowerCase(),
      );
      return match ?? plans.find((p) => p.popular) ?? plans[0];
    });
  }, [plans, planParam]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("BJ");
  const initialCountry = getCountry("BJ")!;
  const [phone, setPhone] = useState(`+${initialCountry.dial} `);
  const [operator, setOperator] = useState<Operator>(initialCountry.operators[0]);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [pending, setPending] = useState<PendingState | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "crypto">("momo");

  // When the country changes: re-prefix the phone with the new dial code
  // and reset the operator if the previous one isn't offered there.
  function handleCountryChange(next: string) {
    const cur = getCountry(country);
    const nx = getCountry(next);
    if (!nx) { setCountry(next); return; }
    setCountry(next);
    // Replace any existing dial-code prefix; keep the locally-typed digits.
    setPhone((prev) => {
      const onlyDigits = String(prev ?? "").replace(/\D/g, "");
      const withoutOld = cur && onlyDigits.startsWith(cur.dial)
        ? onlyDigits.slice(cur.dial.length)
        : onlyDigits;
      return `+${nx.dial} ${withoutOld}`.trimEnd();
    });
    if (!nx.operators.includes(operator)) {
      setOperator(nx.operators[0]);
    }
  }

  const taxes = 0;
  const total = +(((selected?.price ?? 0) + taxes)).toFixed(2);

  const canPay =
    !!selected &&
    email.includes("@") &&
    fullName.trim().length > 1 &&
    (paymentMethod === "crypto" ||
      (phone.replace(/\D/g, "").length >= 8 && !!operator && !!country)) &&
    termsAccepted;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay || !selected) return;
    setErrorMsg("");
    setProcessing(true);
    try {
      const orderData =
        paymentMethod === "momo"
          ? {
              email: email.toLowerCase(), fullName,
              planId: selected.id, planName: selected.name,
              amount: total, currency: "USD",
              method: "momo" as const,
              phone, operator, country,
              termsAccepted: true as const,
              termsVersion: LEGAL_VERSION,
            }
          : {
              email: email.toLowerCase(), fullName,
              planId: selected.id, planName: selected.name,
              amount: total, currency: "USD",
              method: "crypto" as const,
              crypto_currency: "USDT" as const,
              termsAccepted: true as const,
              termsVersion: LEGAL_VERSION,
            };
      const order = await createOrder({ data: orderData });
      if (!order?.order_ref) throw new Error("Could not create order");

      // Stash the per-order cancellation token so the failure page can call
      // markOrderFailed without re-deriving anything client-side. The token is
      // server-signed; without it the cancellation endpoint refuses the call.
      if (typeof window !== "undefined" && order.cancel_token) {
        try {
          sessionStorage.setItem(`nx_cancel_${order.order_ref}`, order.cancel_token);
        } catch {}
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const successUrl = `${origin}/payment/success?ref=${order.order_ref}`;
      const failureUrl = `${origin}/payment/failed?ref=${order.order_ref}`;

      if (paymentMethod === "momo") {
        const result = await initSebPayCheckout({
          data: { ref: order.order_ref, successUrl, failureUrl },
        });
        if (result.providerLink && typeof window !== "undefined") {
          window.open(result.providerLink, "_blank", "noopener,noreferrer");
        }
        setPending({
          orderRef: order.order_ref,
          transactionId: result.transactionId,
          providerLink: result.providerLink,
          message: result.message,
          provider: "sebpay",
        });
      } else {
        const result = await initBinancePayCheckout({
          data: { ref: order.order_ref, successUrl, failureUrl },
        });
        if (result.checkoutUrl && typeof window !== "undefined") {
          window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
        }
        setPending({
          orderRef: order.order_ref,
          transactionId: result.prepayId,
          providerLink: result.checkoutUrl,
          qrcodeLink: result.qrcodeLink,
          message: "Scannez le QR code avec l'app Binance pour payer en BTC, ETH ou USDT.",
          provider: "binance_pay",
        });
      }
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
        <h1 className="sr-only">Checkout — Complete your Nexora IPTV order</h1>
        {pending ? (
          <PendingPanel pending={pending} />
        ) : !selected ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Stepper step={step} />
            <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-8">
              <div className="space-y-6">
                {step === 1 && (
                  <PlanStep
                    plans={plans}
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
                    country={country} setCountry={handleCountryChange}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    termsAccepted={termsAccepted}
                    setTermsAccepted={setTermsAccepted}
                    processing={processing}
                    canPay={canPay}
                    total={total}
                    errorMsg={errorMsg}
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

function PlanStep({ plans, selected, onSelect, onNext }: { plans: Plan[]; selected: Plan; onSelect: (p: Plan) => void; onNext: () => void }) {
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
        {plans.map((p) => {
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
  termsAccepted: boolean; setTermsAccepted: (v: boolean) => void;
  processing: boolean; canPay: boolean; total: number; errorMsg?: string;
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useT();
  const {
    email, setEmail, fullName, setFullName,
    phone, setPhone, operator, setOperator, country, setCountry,
    termsAccepted, setTermsAccepted,
    processing, canPay, total, errorMsg, onBack, onSubmit,
  } = props;
  const countryConf = getCountry(country);
  const operators = countryConf?.operators ?? [];
  const local = convertUsdToLocal(total, country);
  const localFormatted = local.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="glass rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">{t("co.details")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field icon={<User className="h-4 w-4" />} label="Nom complet">
            <input
              required value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </Field>
          <Field icon={<Mail className="h-4 w-4" />} label="Adresse email">
            <input
              required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </Field>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Paiement Mobile Money</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> Sécurisé
          </span>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous recevrez une demande de confirmation sur votre téléphone
            (MTN ou Orange Money).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
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
            <Field icon={<Smartphone className="h-4 w-4" />} label="Opérateur Mobile Money">
              <select
                required value={operator}
                onChange={(e) => setOperator(e.target.value as Operator)}
                className="w-full bg-transparent outline-none text-sm"
              >
                {operators.map((o) => (
                  <option key={o} value={o} className="bg-background">{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field icon={<Phone className="h-4 w-4" />} label="Numéro Mobile Money">
            <input
              required type="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={countryConf ? `+${countryConf.dial} 96XXXXXXX` : "+22996XXXXXXX"}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Vous serez débité <span className="font-mono text-foreground">{localFormatted} {local.currency}</span> via {operator}.
          </p>
        </div>

      </section>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 whitespace-pre-wrap break-words">
          <div className="font-semibold mb-1">Erreur de paiement</div>
          {errorMsg}
        </div>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
          required
        />
        <span className="text-muted-foreground leading-relaxed">
          J'ai lu et j'accepte les{" "}
          <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:underline">CGU</a>,{" "}
          les{" "}
          <a href="/legal/sales" target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:underline">CGV</a>,{" "}
          la{" "}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:underline">politique de confidentialité</a>{" "}
          et la{" "}
          <a href="/legal/refund" target="_blank" rel="noopener noreferrer" className="text-[color:var(--gold)] hover:underline">politique de remboursement</a>.
          Je demande la livraison immédiate du service et renonce, à ce titre, à mon droit de rétractation dès l'activation des identifiants.
        </span>
      </label>

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

  // Poll payment status server-side every 4s for up to ~3min. We never mark
  // "paid" client-side — verifyPayment updates the DB only after confirmation.
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
        <Row label="Référence transaction" value={<span className="font-mono text-xs">{pending.transactionId}</span>} />
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
        Aucun paiement n'est validé tant que la confirmation n'a pas été reçue.
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
  // Default to XOF in the side panel until the customer picks a country
  // in step 2; the in-form line under the phone field shows the precise
  // local-currency amount per country.
  const local = convertUsdToLocal(total, "BJ");
  const localFormatted = local.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
        Débité (estimation) : <span className="font-mono">≈ {localFormatted} {local.currency}</span>
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