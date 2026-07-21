import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  // Scope light Apple-like theme to /app only, without touching global tokens.
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-app-theme");
    document.documentElement.setAttribute("data-app-theme", "smart");
    return () => {
      if (prev) document.documentElement.setAttribute("data-app-theme", prev);
      else document.documentElement.removeAttribute("data-app-theme");
    };
  }, []);

  return (
    <div
      data-nx-app
      className="min-h-screen"
      style={{
        background: "#ffffff",
        color: "#0b0b0f",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
      }}
    >
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 sm:px-8 pb-24">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}

function AppHeader() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: "rgba(255,255,255,0.72)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link to="/app" className="font-semibold tracking-tight text-[15px]" style={{ color: "#0b0b0f" }}>
          NEXORA<span style={{ color: "#8e8e93", fontWeight: 400 }}> Smart Services</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-[13px]" style={{ color: "#3a3a3c" }}>
          <Link to="/app/apps" className="hover:text-black">Applications</Link>
          <Link to="/app/compatibility" className="hover:text-black">Compatibilité</Link>
          <Link to="/app/help" className="hover:text-black">Aide</Link>
          <Link to="/app/about" className="hover:text-black">À propos</Link>
        </nav>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer
      className="mt-16"
      style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafafa" }}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 text-[12px]" style={{ color: "#6e6e73" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} NEXORA Smart Services</div>
          <nav className="flex flex-wrap gap-5">
            <Link to="/app/about" className="hover:text-black">À propos</Link>
            <Link to="/app/help" className="hover:text-black">Centre d'aide</Link>
            <Link to="/app/compatibility" className="hover:text-black">Compatibilité</Link>
          </nav>
        </div>
        <p className="mt-6 leading-relaxed max-w-3xl">
          Nexora ne fournit aucun contenu multimédia, aucune playlist, aucun identifiant, aucun fichier
          M3U, aucun code Xtream, aucun lecteur multimédia et aucun service de diffusion. Les
          téléchargements sont effectués exclusivement depuis les plateformes officielles des éditeurs.
        </p>
      </div>
    </footer>
  );
}