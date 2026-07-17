import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortalSupportTicket, listPortalTickets } from "@/lib/portal.functions";
import { useState } from "react";
import { Loader2, MessageSquare, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/espace-client/support")({
  head: () => ({
    meta: [
      { title: 'Support client — Espace Client Nexora' },
      { name: "description", content: 'Ouvrez un ticket, suivez vos demandes et échangez avec le support Nexora IPTV.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Support client — Espace Client Nexora' },
      { property: "og:description", content: 'Ouvrez un ticket, suivez vos demandes et échangez avec le support Nexora IPTV.' },
      { property: "og:url", content: 'https://nexora-iptv.com/espace-client/support' },
    ],
    links: [{ rel: "canonical", href: 'https://nexora-iptv.com/espace-client/support' }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const list = useServerFn(listPortalTickets);
  const create = useServerFn(createPortalSupportTicket);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portal-tickets"], queryFn: () => list() });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setSent(false); setSubmitting(true);
    try {
      await create({ data: { subject, message, priority } });
      setSent(true); setSubject(""); setMessage(""); setPriority("normal");
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
    } catch (e: any) {
      setErr(e?.message ?? "Impossible d'envoyer.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Contactez-nous — un membre de l'équipe vous répond sous 24h ouvrées.</p>
      </header>

      <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-3 max-w-2xl">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Sujet</span>
          <input required value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Priorité</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Message</span>
          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={6}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {sent && <p className="text-sm text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ticket envoyé.</p>}
        <button type="submit" disabled={submitting}
          className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer le ticket
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold mb-3">Mes tickets</h2>
        {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {q.data && q.data.length === 0 && <p className="text-sm text-muted-foreground">Aucun ticket ouvert.</p>}
        {q.data && q.data.length > 0 && (
          <div className="space-y-2">
            {q.data.map((t: any) => (
              <div key={t.id} className="glass rounded-xl p-4 flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString("fr-FR")} · {t.status} · {t.priority}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}