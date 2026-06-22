import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Lock, ShieldCheck, Tv, CreditCard } from "lucide-react";
import { getOrderByRef } from "@/lib/orders.functions";
import { confirmCheckoutPayment } from "@/lib/payments.functions";
import { markOrderFailed } from "@/lib/orders.functions";

export const Route = createFileRoute("/pay/$ref")({
  head: () => ({
    meta: [
      { title: "SebPay — Secure Checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    success: typeof s.success === "string" ? s.success : undefined,
    cancel: typeof s.cancel === "string" ? s.cancel : undefined,
  }),
  component: HostedCheckout,
});

function HostedCheckout() {
  const { ref } = Route.useParams();
  const { success, cancel } = Route.useSearch();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getOrderByRef);
  const confirmFn = useServerFn(confirmCheckoutPayment);
  const failFn = useServerFn(markOrderFailed);

  const { data: order, isLoading } = useQuery({
    queryKey: ["pay-order", ref],
    queryFn: () => fetchOrder({ data: { ref } }),
  });

  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [err, setErr] = useState("");

  async function doPay() {
    setErr("");
    setBusy("pay");
    try {
      await confirmFn({ data: { ref } });
      const target = success ?? `/payment/success?ref=${encodeURIComponent(ref)}`;
      if (/^https?:\/\//i.test(target)) window.location.href = target;
      else navigate({ to: target });
    } catch (e: any) {
      setErr(e?.message ?? "Payment failed");
      setBusy(null);
    }
  }

  async function doCancel() {
    setBusy("cancel");
    try {
      await failFn({ data: { ref, status: "cancelled" } });
    } catch {}
    const target = cancel ?? `/payment/failed?ref=${encodeURIComponent(ref)}`;
    if (/^https?:\/\//i.test(target)) window.location.href = target;
    else navigate({ to: target });
  }

  if (isLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--gold)]" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Order not found.</p>
      </main>
    );
  }

  const finalized = ["paid", "failed", "cancelled"].includes(order.status);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center">
              <Tv className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold tracking-wide">SebPay</span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-[color:var(--gold)]" /> Secure checkout
          </span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Confirm your payment</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Order <span className="font-mono">{order.order_ref}</span>
          </p>

          <div className="rounded-xl border border-white/10 p-5 mb-6 space-y-2 text-sm">
            <Row label="Merchant" value="Nexora IPTV" />
            <Row label="Plan" value={order.plan_name} />
            <Row label="Customer" value={order.full_name} />
            <Row label="Email" value={order.email} />
            <Row label="Method" value={String(order.method).toUpperCase()} />
            <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-white/10">
              <span className="text-muted-foreground">Total due</span>
              <span className="text-2xl font-bold text-gradient-gold">
                ${Number(order.amount).toFixed(2)} {order.currency}
              </span>
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          )}

          {finalized ? (
            <p className="text-sm text-muted-foreground">
              This order is already <strong>{order.status}</strong>.
            </p>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button
                onClick={doCancel}
                disabled={busy !== null}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancel and return
              </button>
              <button
                onClick={doPay}
                disabled={busy !== null}
                className="btn-gold btn-gold-hover px-8 py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === "pay" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> Pay ${Number(order.amount).toFixed(2)}</>
                )}
              </button>
            </div>
          )}

          <p className="mt-6 text-[11px] text-muted-foreground/70 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--gold)]" />
            Payments are encrypted end-to-end and processed by SebPay.
          </p>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}