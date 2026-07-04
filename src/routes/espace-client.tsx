import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPortalMe, signOutPortal } from "@/lib/portal.functions";
import { LayoutDashboard, RefreshCcw, ShoppingBag, LifeBuoy, User, Megaphone, Download, LogOut, Menu, Home } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/espace-client")({
  head: () => ({
    meta: [
      { title: "Espace Client — Nexora IPTV" },
      { name: "description", content: "Gérez votre abonnement Nexora IPTV : renouvellement, factures, support, profil." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalLayout,
});

const NAV = [
  { to: "/espace-client/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/espace-client/renew", label: "Renouveler", icon: RefreshCcw },
  { to: "/espace-client/orders", label: "Commandes", icon: ShoppingBag },
  { to: "/espace-client/support", label: "Support", icon: LifeBuoy },
  { to: "/espace-client/profile", label: "Profil", icon: User },
  { to: "/espace-client/announcements", label: "Annonces", icon: Megaphone },
  { to: "/espace-client/downloads", label: "Téléchargements", icon: Download },
];

function PortalLayout() {
  const location = useLocation();
  const router = useRouter();
  const isLogin = location.pathname === "/espace-client" || location.pathname === "/espace-client/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const signOut = useServerFn(signOutPortal);
  const me = useQuery({
    queryKey: ["portal-me"],
    queryFn: () => getPortalMe(),
  });

  if (isLogin) {
    // Login page renders its own bare shell
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-[color:var(--gold)]/10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
              <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Home className="h-4 w-4" /> Accueil
            </Link>
          </div>
        </header>
        <div className="pt-16">
          <Outlet />
        </div>
      </div>
    );
  }

  const authed = me.data?.authenticated;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Topbar mobile */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-[color:var(--gold)]/10 md:hidden">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 -ml-2">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/espace-client/dashboard" className="font-semibold tracking-wide">
            NEXORA <span className="text-gradient-gold">IPTV</span>
          </Link>
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {me.data?.email ?? ""}
          </span>
        </div>
      </header>

      <div className="flex min-h-screen pt-14 md:pt-0">
        {/* Sidebar */}
        <aside
          className={`${mobileOpen ? "block" : "hidden"} md:block fixed md:sticky top-14 md:top-0 left-0 z-30 h-[calc(100vh-3.5rem)] md:h-screen w-64 border-r border-white/10 bg-background/95 backdrop-blur`}
        >
          <div className="p-5 border-b border-white/10 hidden md:block">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">NEXORA <span className="text-gradient-gold">IPTV</span></div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Espace client</div>
              </div>
            </Link>
          </div>
          <nav className="p-3 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-[color:var(--gold)]/15 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
            {authed && (
              <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
                {me.data?.email}
              </div>
            )}
            <button
              onClick={async () => {
                await signOut({});
                router.navigate({ to: "/espace-client" });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}