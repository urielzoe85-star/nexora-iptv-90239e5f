import { Star, StarHalf } from "lucide-react";

export function RatingBadge({
  avg,
  count,
  size = "sm",
  className = "",
}: {
  avg: number;
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const rounded = Math.round(avg * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded - full === 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const px = size === "lg" ? 20 : size === "md" ? 16 : 14;
  const text = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${text} ${className}`}
      aria-label={`Noté ${avg.toFixed(1)} sur 5 (${count} avis)`}
    >
      <div className="flex items-center" aria-hidden="true">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f-${i}`} size={px} className="fill-[color:var(--gold)] text-[color:var(--gold)]" />
        ))}
        {half && (
          <StarHalf size={px} className="fill-[color:var(--gold)] text-[color:var(--gold)]" />
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e-${i}`} size={px} className="text-[color:var(--gold)]/30" />
        ))}
      </div>
      <span className="font-semibold">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">· {count.toLocaleString("fr-FR")} avis</span>
    </div>
  );
}

export function RatingBadgeFloating({ avg, count }: { avg: number; count: number }) {
  return (
    <div
      className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white shadow-lg"
      aria-label={`Noté ${avg.toFixed(1)} sur 5 (${count} avis)`}
    >
      <Star size={12} className="fill-[color:var(--gold)] text-[color:var(--gold)]" />
      <span>{avg.toFixed(1)}</span>
      <span className="text-white/60">({count.toLocaleString("fr-FR")})</span>
    </div>
  );
}