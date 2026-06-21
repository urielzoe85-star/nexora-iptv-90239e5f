import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Search, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { getOrdersByEmail } from "@/lib/orders.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Customer Dashboard — Nexora IPTV" },
      { name: "description", content: "View your Nexora IPTV orders and subscription status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ email: typeof s.email === "string" ? s.email : "" }),
  component: Dashboard,
});

type Order = {
  order_ref: string; plan_name: string; amount: number; currency: string;
  method: string; status: string; created_at: string;
};

function Dashboard() {
  const { email: initial } = Route.useSearch();
  const [email, setEmail] = useState(initial ?? "");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(addr: string) {
    if (!addr.includes("@")) return;
    setLoading(true);
    try {
      const rows = await getOrdersByEmail({ data: { email: addr.toLowerCase() } });
      setOrders(rows as Order[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (initial) load(initial); }, [initial]);

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
          <Link to="/checkout" className="btn-gold btn-gold-hover px-4 py-2 rounded-full text-xs font-semibold">New subscription</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">My orders</h1>
        <p className="text-sm text-muted-foreground mb-8">Enter the email you used at checkout to view your payment history.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); load(email); }}
          className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="flex items-center gap-2 flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </div>
          <button type="submit" className="btn-gold btn-gold-hover px-6 py-2 rounded-full text-sm font-semibold">
            Look up orders
          </button>
        </form>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {orders && orders.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No orders found for this email.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_ref} className="border-b border-white/5 last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs">{o.order_ref}</td>
                    <td className="px-4 py-3">{o.plan_name}</td>
                    <td className="px-4 py-3">${Number(o.amount).toFixed(2)} {o.currency}</td>
                    <td className="px-4 py-3 uppercase text-xs text-muted-foreground">{o.method}</td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    cancelled: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  };
  const cls = map[status] ?? map.pending;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${cls}`}>{status}</span>;
}