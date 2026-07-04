import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminRenewalPlans, upsertRenewalPlan, deleteRenewalPlan,
  listAdminRenewalOrders, listAdminPortalSessions,
  listAdminAnnouncements, upsertAnnouncement, deleteAnnouncement,
} from "@/lib/portal-admin.functions";
import { useState } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

export const Route = createFileRoute("/ncc/portal")({
  component: NccPortalPage,
});

type Tab = "plans" | "renewals" | "announcements" | "sessions";

function NccPortalPage() {
  const [tab, setTab] = useState<Tab>("plans");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Espace client</h1>
        <p className="text-sm text-muted-foreground">Offres de renouvellement, annonces et sessions du portail.</p>
      </header>
      <nav className="flex gap-2 border-b border-border">
        {(["plans", "renewals", "announcements", "sessions"] as Tab[]).map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "plans" && "Offres"}
            {t === "renewals" && "Renouvellements"}
            {t === "announcements" && "Annonces"}
            {t === "sessions" && "Sessions"}
          </button>
        ))}
      </nav>
      {tab === "plans" && <PlansTab />}
      {tab === "renewals" && <RenewalsTab />}
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "sessions" && <SessionsTab />}
    </div>
  );
}

function PlansTab() {
  const list = useServerFn(listAdminRenewalPlans);
  const save = useServerFn(upsertRenewalPlan);
  const del = useServerFn(deleteRenewalPlan);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-renewal-plans"], queryFn: () => list() });

  const [draft, setDraft] = useState<any | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    await save({ data: {
      id: draft.id,
      duration_months: Number(draft.duration_months),
      name: draft.name,
      price: Number(draft.price),
      currency: draft.currency || "USD",
      description: draft.description ?? null,
      active: !!draft.active,
      sort_order: Number(draft.sort_order ?? 0),
    } });
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-renewal-plans"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setDraft({ duration_months: 1, name: "", price: 0, currency: "USD", active: true, sort_order: 0 })}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">
          <Plus className="h-4 w-4" /> Nouvelle offre
        </button>
      </div>

      {draft && (
        <form onSubmit={submit} className="rounded-xl border border-border p-4 space-y-3 grid grid-cols-2 md:grid-cols-6 gap-3">
          <label className="text-sm col-span-2 md:col-span-1"><span className="text-xs text-muted-foreground">Durée (mois)</span>
            <input required type="number" min={1} value={draft.duration_months} onChange={(e) => setDraft({ ...draft, duration_months: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm col-span-2"><span className="text-xs text-muted-foreground">Nom</span>
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm"><span className="text-xs text-muted-foreground">Prix</span>
            <input required type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm"><span className="text-xs text-muted-foreground">Devise</span>
            <input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm"><span className="text-xs text-muted-foreground">Ordre</span>
            <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm col-span-2 md:col-span-6"><span className="text-xs text-muted-foreground">Description</span>
            <textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm" />
          </label>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Actif
          </label>
          <div className="col-span-2 md:col-span-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 rounded-md border border-border text-sm">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">
              <Save className="h-4 w-4" /> Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Durée</th>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Prix</th>
              <th className="text-left px-3 py-2">Actif</th>
              <th className="text-left px-3 py-2">Ordre</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data ?? []).map((p: any) => (
              <tr key={p.id}>
                <td className="px-3 py-2">{p.duration_months} mois</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 font-mono">{p.price} {p.currency}</td>
                <td className="px-3 py-2">{p.active ? "Oui" : "Non"}</td>
                <td className="px-3 py-2">{p.sort_order}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => setDraft({ ...p })} className="text-xs text-primary hover:underline">Éditer</button>
                  <button onClick={async () => {
                    if (!confirm(`Supprimer "${p.name}" ?`)) return;
                    await del({ data: { id: p.id } });
                    qc.invalidateQueries({ queryKey: ["admin-renewal-plans"] });
                  }} className="text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RenewalsTab() {
  const list = useServerFn(listAdminRenewalOrders);
  const [status, setStatus] = useState<string>("");
  const q = useQuery({
    queryKey: ["admin-renewal-orders", status],
    queryFn: () => list({ data: { status: status || undefined, limit: 100 } }),
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center text-sm">
        <label>Statut :</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-transparent px-2 py-1">
          <option value="">Tous</option>
          <option value="pending">En attente</option>
          <option value="processing">En cours</option>
          <option value="completed">Terminé</option>
          <option value="failed">Échoué</option>
          <option value="refunded">Remboursé</option>
        </select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Référence</th>
              <th className="text-left px-3 py-2">Client</th>
              <th className="text-left px-3 py-2">Offre</th>
              <th className="text-left px-3 py-2">Montant</th>
              <th className="text-left px-3 py-2">Méthode</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(q.data ?? []).map((o: any) => (
              <tr key={o.order_ref}>
                <td className="px-3 py-2 font-mono text-xs">{o.order_ref}</td>
                <td className="px-3 py-2">{o.email}</td>
                <td className="px-3 py-2">{o.plan_name}</td>
                <td className="px-3 py-2 font-mono">{Number(o.amount).toFixed(2)} {o.currency}</td>
                <td className="px-3 py-2">{o.method}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const list = useServerFn(listAdminAnnouncements);
  const save = useServerFn(upsertAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-announcements"], queryFn: () => list() });
  const [draft, setDraft] = useState<any | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    await save({ data: {
      id: draft.id,
      title: draft.title,
      body: draft.body,
      severity: (draft.severity ?? "info") as "info" | "warning" | "critical",
      active: !!draft.active,
    } });
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setDraft({ title: "", body: "", severity: "info", active: true })}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">
          <Plus className="h-4 w-4" /> Nouvelle annonce
        </button>
      </div>
      {draft && (
        <form onSubmit={submit} className="rounded-xl border border-border p-4 space-y-3">
          <input required placeholder="Titre" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
          <textarea required placeholder="Contenu" rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" />
          <div className="flex gap-3 items-center flex-wrap">
            <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm">
              <option value="info">Info</option>
              <option value="warning">Attention</option>
              <option value="critical">Critique</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Publiée
            </label>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 rounded-md border border-border text-sm">Annuler</button>
              <button type="submit" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="space-y-2">
        {(q.data ?? []).map((a: any) => (
          <div key={a.id} className="rounded-xl border border-border p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium">{a.title} <span className="text-xs text-muted-foreground">({a.severity})</span></div>
              <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>
              <div className="text-xs text-muted-foreground mt-1">{a.active ? "Publiée" : "Masquée"} · {new Date(a.published_at).toLocaleDateString("fr-FR")}</div>
            </div>
            <button onClick={() => setDraft({ ...a })} className="text-xs text-primary hover:underline">Éditer</button>
            <button onClick={async () => {
              if (!confirm("Supprimer cette annonce ?")) return;
              await del({ data: { id: a.id } });
              qc.invalidateQueries({ queryKey: ["admin-announcements"] });
            }} className="text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3 inline" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsTab() {
  const list = useServerFn(listAdminPortalSessions);
  const q = useQuery({ queryKey: ["admin-portal-sessions"], queryFn: () => list() });
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Client</th>
            <th className="text-left px-3 py-2">Dernière activité</th>
            <th className="text-left px-3 py-2">IP</th>
            <th className="text-left px-3 py-2">Statut</th>
            <th className="text-left px-3 py-2">Créée</th>
            <th className="text-left px-3 py-2">Expire</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(q.data ?? []).map((s: any) => (
            <tr key={s.id}>
              <td className="px-3 py-2">{s.email}</td>
              <td className="px-3 py-2">{new Date(s.last_seen_at).toLocaleString("fr-FR")}</td>
              <td className="px-3 py-2 font-mono text-xs">{s.ip ?? "—"}</td>
              <td className="px-3 py-2">{s.revoked_at ? "Révoquée" : "Active"}</td>
              <td className="px-3 py-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR")}</td>
              <td className="px-3 py-2 text-muted-foreground">{new Date(s.expires_at).toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}