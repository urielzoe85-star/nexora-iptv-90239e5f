import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LEGAL_VERSION } from "@/lib/legal-version";

export function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Accueil</Link>
        </div>
      </header>
      <main className="pt-28 pb-24">
        <article className="max-w-3xl mx-auto px-6">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">
            Version {LEGAL_VERSION}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
          {intro ? (
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{intro}</p>
          ) : null}
          <div className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-3 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-[color:var(--gold)]">
            {children}
          </div>
          <nav aria-label="Documents légaux" className="mt-16 flex flex-wrap gap-3 text-sm">
            <LegalLink to="/legal/terms">CGU</LegalLink>
            <LegalLink to="/legal/sales">CGV</LegalLink>
            <LegalLink to="/legal/privacy">Confidentialité</LegalLink>
            <LegalLink to="/legal/refund">Remboursement</LegalLink>
            <LegalLink to="/legal/notice">Mentions légales</LegalLink>
          </nav>
        </article>
      </main>
    </div>
  );
}

function LegalLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[color:var(--gold)]/50 text-muted-foreground hover:text-foreground transition"
    >
      {children}
    </Link>
  );
}
