import { createFileRoute, Link } from "@tanstack/react-router";
import { PartyPopper, Tv, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { getOrderByRef } from "@/lib/orders.functions";

export const Route = createFileRoute("/payment/success")({
  head: () => ({
    meta: [
      { title: "Payment Successful — Nexora IPTV" },
      { name: "description", content: "Your Nexora IPTV subscription is being activated." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : "" }),
  component: SuccessPage,
});

function SuccessPage() {
  const { ref } = Route.useSearch();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) { setLoading(false); return; }
    getOrderByRef({ data: { ref } }).then((o) => { setOrder(o); setLoading(false); });
  }, [ref]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <section className="glass rounded-2xl p-8 md:p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[image:var(--gradient-gold)] grid place-items-center mb-5">
            <PartyPopper className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment successful</h1>
          <p className="text-muted-foreground mb-6">
            Thank you. Your subscription is being activated.
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading order…</p>
          ) : order ? (
            <div className="mx-auto max-w-md text-left rounded-xl border border-white/10 divide-y divide-white/5">
              <Row label="Order ID" value={<span className="font-mono">{order.order_ref}</span>} />
              <Row label="Plan" value={order.plan_name} />
              <Row label="Amount" value={`$${Number(order.amount).toFixed(2)} ${order.currency}`} />
              <Row label="Method" value={order.method.toUpperCase()} />
              <Row label="Delivery email" value={order.email} />
              <Row label="Status" value={<span className="text-[color:var(--gold)] capitalize">{order.status}</span>} />
              {order.sebpay_reference && <Row label="SebPay ref" value={<span className="font-mono text-xs">{order.sebpay_reference}</span>} />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Order not found.</p>
          )}

          <p className="text-sm text-muted-foreground mt-6 inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-[color:var(--gold)]" />
            Your credentials will arrive by email within a few minutes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="px-6 py-3 rounded-full glass hover:border-[color:var(--gold)]/40 transition text-sm font-medium">Back to home</Link>
            <Link to="/dashboard" search={{ email: order?.email ?? "" }} className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold">View my orders</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center">
            <Tv className="h-4 w-4 text-black" />
          </div>
          <span className="font-bold tracking-wide">NEXORA <span className="text-[color:var(--gold)]">IPTV</span></span>
        </Link>
      </div>
    </header>
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