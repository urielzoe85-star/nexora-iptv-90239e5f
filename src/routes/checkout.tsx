import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Check, CreditCard, Lock, ShieldCheck, ChevronLeft, Mail, User,
  Loader2, Tv,
} from "lucide-react";
import { createOrder, finalizeOrder } from "@/lib/orders.functions";
import { initSebPayPayment, SEBPAY_PUBLIC_KEY } from "@/lib/sebpay";
import { useT, LanguageSwitcher } from "@/i18n/context";

type Plan = { id: string; name: string; price: number; period: string; save?: string; popular?: boolean };

const PLANS: Plan[] = [
  { id: "1m",  name: "1 Month",   price: 12, period: "/month" },
  { id: "3m",  name: "3 Months",  price: 30, period: "/quarter",   save: "Save 17%" },
  { id: "6m",  name: "6 Months",  price: 55, period: "/6 months",  save: "Save 24%" },
  { id: "12m", name: "12 Months", price: 95, period: "/year",      save: "Save 34%", popular: true },
];

const PLAN_INCLUDES = [
  "20,000+ live channels worldwide",
  "120,000+ movies & series (VOD)",
  "Full HD, FHD & 4K streaming",
  "Anti-freeze, anti-buffering servers",
  "Compatible with all devices",
  "Instant activation by email",
];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Nexora IPTV" },
      { name: "description", content: "Secure checkout for your Nexora IPTV subscription. Encrypted payments, instant activation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const router = useRouter();
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
  const [method, setMethod] = useState<"card" | "crypto" | "momo">("card");
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: "" });
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const taxes = +(selected.price * 0.0).toFixed(2);
  const total = +(selected.price + taxes).toFixed(2);

  const canPay =
    email.includes("@") &&
    fullName.trim().length > 1 &&
    (method !== "card" ||
      (card.number.replace(/\s/g, "").length >= 13 && card.exp.length >= 4 && card.cvc.length >= 3));

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
          method,
        },
      });
      if (!order?.order_ref) throw new Error("Could not create order");

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await initSebPayPayment({
        orderRef: order.order_ref,
        amount: total,
        currency: "USD",
        email: email.toLowerCase(),
        fullName,
        method,
        card: method === "card" ? card : undefined,
        successUrl: `${origin}/payment/success?ref=${order.order_ref}`,
        failureUrl: `${origin}/payment/failed?ref=${order.order_ref}`,
      });

      if (result.status === "paid") {
        await finalizeOrder({
          data: { ref: order.order_ref, status: "paid", sebpayReference: result.transactionId },
        });
        router.navigate({ to: "/payment/success", search: { ref: order.order_ref } });
      } else {
        await finalizeOrder({
          data: { ref: order.order_ref, status: result.status === "cancelled" ? "cancelled" : "failed" },
        });
        router.navigate({ to: "/payment/failed", search: { ref: order.order_ref } });
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? t("co.err.generic"));
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
                method={method} setMethod={setMethod}
                card={card} setCard={setCard}
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
  method: "card" | "crypto" | "momo"; setMethod: (v: "card" | "crypto" | "momo") => void;
  card: { number: string; exp: string; cvc: string; name: string };
  setCard: (v: { number: string; exp: string; cvc: string; name: string }) => void;
  processing: boolean; canPay: boolean; total: number; errorMsg?: string;
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  const t = useT();
  const { email, setEmail, fullName, setFullName, method, setMethod, card, setCard, processing, canPay, total, errorMsg, onBack, onSubmit } = props;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="glass rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">{t("co.details")}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field icon={<User className="h-4 w-4" />} label={t("co.field.name")}>
            <input
              required value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={t("co.field.namePh")}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </Field>
          <Field icon={<Mail className="h-4 w-4" />} label={t("co.field.email")}>
            <input
              required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t("co.field.emailPh")}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </Field>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t("co.method.title")}</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-[color:var(--gold)]" /> {t("co.method.pci")}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <MethodTab active={method === "card"}   onClick={() => setMethod("card")}   label={t("co.method.card")} />
          <MethodTab active={method === "crypto"} onClick={() => setMethod("crypto")} label={t("co.method.crypto")} />
          <MethodTab active={method === "momo"}   onClick={() => setMethod("momo")}   label={t("co.method.momo")} />
        </div>

        {method === "card" && (
          <div className="space-y-4">
            <Field icon={<CreditCard className="h-4 w-4" />} label={t("co.card.number")}>
              <input
                inputMode="numeric" required value={card.number}
                onChange={e => setCard({ ...card, number: formatCard(e.target.value) })}
                placeholder="1234 5678 9012 3456" maxLength={23}
                className="w-full bg-transparent outline-none text-sm tracking-wider placeholder:text-muted-foreground/60"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("co.card.exp")}>
                <input
                  required value={card.exp}
                  onChange={e => setCard({ ...card, exp: formatExp(e.target.value) })}
                  placeholder="12/28" maxLength={5}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                />
              </Field>
              <Field label={t("co.card.cvc")}>
                <input
                  required value={card.cvc}
                  onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder="123" maxLength={4}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
                />
              </Field>
            </div>
            <Field label={t("co.card.holder")}>
              <input
                value={card.name} onChange={e => setCard({ ...card, name: e.target.value })}
                placeholder={t("co.card.holderPh")}
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              />
            </Field>
          </div>
        )}

        {method === "crypto" && (
          <div className="rounded-xl border border-white/10 p-5 text-sm text-muted-foreground">
            {t("co.crypto.text")}
          </div>
        )}

        {method === "momo" && (
          <div className="rounded-xl border border-white/10 p-5 text-sm text-muted-foreground">
            {t("co.momo.text")}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/70 mt-4">
          {t("co.processedBy")} <span className="text-foreground">SebPay</span>. <span className="font-mono">{SEBPAY_PUBLIC_KEY.slice(0, 12)}…</span>
        </p>
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
                      : (<><Lock className="h-4 w-4" /> {t("co.pay")} ${total.toFixed(2)}</>)}
        </button>
      </div>
    </form>
  );
}

function OrderSummary({ plan, taxes, total }: { plan: Plan; taxes: number; total: number }) {
  const t = useT();
  const planNameMap: Record<string, string> = {
    "1m": t("pricing.month"), "3m": t("pricing.3months"),
    "6m": t("pricing.6months"), "12m": t("pricing.12months"),
  };
  const planName = planNameMap[plan.id] ?? plan.name;
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

function MethodTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${active
        ? "border-[color:var(--gold)] bg-white/[0.04] text-foreground"
        : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
      {label}
    </button>
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

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}
function formatExp(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : digits.slice(0, 2) + "/" + digits.slice(2);
}