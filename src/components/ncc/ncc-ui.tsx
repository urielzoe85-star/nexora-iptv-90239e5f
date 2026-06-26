import { Badge } from "@/components/ui/badge";

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function fmtMoney(amount: number | null | undefined, currency = "USD"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

const STATUS_TONES: Record<string, string> = {
  active:     "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  disabled:   "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  pending:    "bg-amber-500/15 text-amber-500 border-amber-500/30",
  paid:       "bg-blue-500/15 text-blue-500 border-blue-500/30",
  processing: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  completed:  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelled:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  refunded:   "bg-rose-500/15 text-rose-500 border-rose-500/30",
  suspended:  "bg-amber-500/15 text-amber-500 border-amber-500/30",
  expired:    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  converted:  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  revoked:    "bg-rose-500/15 text-rose-500 border-rose-500/30",
  archived:   "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  queued:     "bg-amber-500/15 text-amber-500 border-amber-500/30",
  sent:       "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed:     "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status ?? "—").toLowerCase();
  return (
    <Badge variant="outline" className={`font-normal ${STATUS_TONES[s] ?? ""}`}>
      {status ?? "—"}
    </Badge>
  );
}