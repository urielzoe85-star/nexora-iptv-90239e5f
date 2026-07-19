import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalOrderStatus } from "@/lib/portal.functions";
import { initSebPayCheckout, initCheckout, submitBinanceProof } from "@/lib/payments.functions";
import { Bitcoin, ExternalLink, Loader2, Clock, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { PaymentMethodsMarquee } from "@/components/PaymentMethodsMarquee";

export const Route = createFileRoute("/espace-client/pay/$ref")({
  component: PayPage,
});

const BINANCE_QR_SRC = "/binance-pay-qr.png";
const BINANCE_RECIPIENT = "Nexora Smart Services";

function PayPage() {
  const { ref } = Route.useParams();
  const router = useRouter();
  const status = useServerFn(getPortalOrderStatus);
  const initSeb = useServerFn(initSebPayCheckout);
  const initCamer = useServerFn(initCheckout);
  const submitProof = useServerFn(submitBinanceProof);

  const q = useQuery({
    queryKey: ["portal-order", ref],
    queryFn: () => status({ data: { orderRef: ref } }),
    refetchInterval: 5000,
  });

  const [sebStarted, setSebStarted] = useState(false);
  const [sebErr, setSebErr] = useState("");
  const [cardStarted, setCardStarted] = useState(false);
  const [cardErr, setCardErr] = useState("");
  const [accountName, setAccountName] = useState("");
  const [txId, setTxId] = useState("");
  const [uid, setUid] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const o = q.data;

  // Redirection auto vers success dès qu'on est payé/completed
  useEffect(() => {
    if (o && (o.status === "completed" || o.status === "paid")) {
      router.navigate({ to: "/espace-client/success/$ref", params: { ref } });
    }
  }, [o?.status, router, ref]);

  async function startSebPay() {
    setSebErr("");
    try {
      const origin = window.location.origin;
      const res = await initSeb({
        data: {
          ref,
          successUrl: `${origin}/espace-client/success/${ref}`,
          failureUrl: `${origin}/espace-client/pay/${ref}`,
        },
      });
      setSebStarted(true);
      if (res.providerLink) window.location.href = res.providerLink;
    } catch (e: any) {
      setSebErr(e?.message ?? "Impossible de lancer le paiement.");
    }
  }

  async function startCardPayPal() {
    setCardErr("");
    try {
      const origin = window.location.origin;
      const res = await initCamer({
        data: {
          ref,
          successUrl: `${origin}/espace-client/success/${ref}`,
          failureUrl: `${origin}/espace-client/pay/${ref}`,
        },
      });
      setCardStarted(true);
      if (res.providerLink) window.location.href = res.providerLink;
    } catch (e: any) {
      setCardErr(e?.message ?? "Impossible de lancer le paiement.");
    }
  }

  async function sendProof(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSubmitting(true);
    try {
      await submitProof({
        data: {
          ref,
          accountName: accountName.trim(),
          binanceUid: uid.trim() || undefined,
          transactionId: txId.trim(),
        },
      });
      setSubmitted(true);
    } catch (e: any) {
      setErr(e?.message ?? "Impossible d'envoyer la preuve.");
    } finally { setSubmitting(false); }
  }

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Chargement de la commande…</p>;
  if (!o) return <p className="text-sm text-destructive">Commande introuvable.</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Paiement — {o.plan_name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Référence : <span className="font-mono text-foreground">{o.order_ref}</span> · Montant :{" "}
          <span className="font-mono text-foreground">{Number(o.amount).toFixed(2)} {o.currency}</span>
        </p>
      </header>

      {o.method === "momo" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous allez être redirigé vers SebPay pour finaliser le paiement Mobile Money.
            Après validation, votre abonnement est prolongé automatiquement.
          </p>
          {sebErr && <p className="text-sm text-destructive">{sebErr}</p>}
          {!sebStarted ? (
            <button onClick={startSebPay} className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> Lancer le paiement Mobile Money
            </button>
          ) : (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Redirection en cours…
            </p>
          )}
        </div>
      )}

      {(o.method === "card" || o.method === "paypal") && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            {o.method === "card" ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            Vous allez être redirigé vers la page de paiement sécurisée
            {o.method === "card" ? " Stripe" : " PayPal"} hébergée par CamerPay.
          </p>
          {cardErr && <p className="text-sm text-destructive">{cardErr}</p>}
          {!cardStarted ? (
            <button onClick={startCardPayPal} className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {o.method === "card" ? "Payer par carte" : "Payer avec PayPal"}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Redirection en cours…
            </p>
          )}
        </div>
      )}

      {o.method === "crypto" && !submitted && (
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="rounded-xl bg-white p-3 inline-block mb-3">
                <img src={BINANCE_QR_SRC} alt="QR Binance Pay" className="h-56 w-56 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
              </div>
              <div className="text-sm">Destinataire : <span className="font-semibold">{BINANCE_RECIPIENT}</span></div>
              <div className="text-2xl font-bold text-gradient-gold mt-1">{Number(o.amount).toFixed(2)} {o.currency}</div>
              <a href="binancepay://" className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full btn-gold btn-gold-hover text-sm font-semibold">
                <Bitcoin className="h-4 w-4" /> Ouvrir Binance
              </a>
            </div>
            <form onSubmit={sendProof} className="space-y-3">
              <p className="text-sm text-muted-foreground">Une fois le paiement effectué, envoyez la preuve :</p>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Nom du compte Binance</span>
                <input required value={accountName} onChange={(e) => setAccountName(e.target.value)} maxLength={120}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">UID Binance (optionnel)</span>
                <input value={uid} onChange={(e) => setUid(e.target.value)} maxLength={40}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">ID de transaction *</span>
                <input required value={txId} onChange={(e) => setTxId(e.target.value)} maxLength={120}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-mono" />
              </label>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button type="submit" disabled={submitting || accountName.trim().length < 2 || txId.trim().length < 4}
                className="btn-gold btn-gold-hover w-full px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Envoyer la preuve
              </button>
            </form>
          </div>
        </div>
      )}

      {(submitted || o.status === "processing") && o.method === "crypto" && (
        <div className="glass rounded-2xl p-6 text-center">
          <Clock className="h-10 w-10 mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-semibold">Paiement en attente de vérification</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Nous vérifions votre transaction. Vous serez redirigé automatiquement une fois validé.
          </p>
        </div>
      )}

      <div className="text-center">
        <Link to="/espace-client/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au tableau de bord
        </Link>
      </div>

      <PaymentMethodsMarquee />
    </div>
  );
}