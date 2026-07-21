import { ArrowLeft } from "lucide-react";
import { useRouter, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Bouton "Retour" flottant discret, rendu sur toutes les pages publiques.
 * - Masqué sur la page d'accueil et les backoffices (/ncc/*, /admin/*).
 * - Utilise l'historique du navigateur ; retombe sur "/" si aucune entrée précédente.
 */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const hidden =
    pathname === "/" ||
    pathname === "/fr" ||
    pathname === "/en" ||
    pathname === "/de" ||
    pathname.startsWith("/ncc") ||
    pathname.startsWith("/admin") ||
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/.mcp");

  if (!mounted || hidden) return null;

  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: fallback });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Retour à la page précédente"
      className="fixed top-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-background hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 sm:top-4 sm:left-4 sm:text-sm"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Retour</span>
    </button>
  );
}