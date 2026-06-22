import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, Tv, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getOrderByRef, markOrderFailed } from "@/lib/orders.functions";
import { useT } from "@/i18n/context";

export const Route = createFileRoute("/payment/failed")({
  head: () => ({
    meta: [
      { title: "Payment Failed — Nexora IPTV" },
      { name: "description", content: "Your payment could not be processed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : "" }),
  component: FailedPage,
});

function FailedPage() {
  const t = useT();
  const { ref } = Route.useSearch();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!ref) return;
    (async () => {
      // Best-effort: flip pending/processing to "failed" when the user lands
      // here. Already-final orders are untouched (no-op).
      await markOrderFailed({ data: { ref, status: "failed" } }).catch(() => {});
      const o = await getOrderByRef({ data: { ref } });
      setOrder(o);
    })();
  }, [ref]);

  return (
    <main className="min-h-screen bg-background text-foreground">
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

      <div className="max-w-2xl mx-auto px-6 py-16">
        <section className="glass rounded-2xl p-8 md:p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-500/15 border border-red-500/40 grid place-items-center mb-5">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("fail.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("fail.sub")}</p>

          {order && (
            <div className="mx-auto max-w-md text-left rounded-xl border border-white/10 divide-y divide-white/5 mb-6">
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("ok.row.id")}</span>
                <span className="font-mono">{order.order_ref}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("ok.row.plan")}</span>
                <span>{order.plan_name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("ok.row.status")}</span>
                <span className="text-red-400">{t(`status.${order.status}`)}</span>
              </div>
              {order.metadata?.failure_reason && (
                <div className="px-4 py-3 text-sm">
                  <div className="text-muted-foreground mb-1">Raison</div>
                  <div className="text-red-300">{order.metadata.failure_reason}</div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/checkout" className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" /> {t("fail.retry")}
            </Link>
            <Link to="/" className="px-6 py-3 rounded-full glass hover:border-[color:var(--gold)]/40 transition text-sm font-medium">{t("fail.home")}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}