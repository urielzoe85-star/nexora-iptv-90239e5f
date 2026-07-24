import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Tv2 } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";

export const Route = createFileRoute("/ncc/iptv")({ component: IptvLayout });

const TABS = [
  { to: "/ncc/iptv",               label: "Dashboard",     exact: true },
  { to: "/ncc/iptv/essai",         label: "Essai gratuit" },
  { to: "/ncc/iptv/premium-1m",    label: "Premium 1 Mois" },
  { to: "/ncc/iptv/premium-3m",    label: "Premium 3 Mois" },
  { to: "/ncc/iptv/premium-6m",    label: "Premium 6 Mois" },
  { to: "/ncc/iptv/premium-12m",   label: "Premium 12 Mois" },
  { to: "/ncc/iptv/clients",       label: "Clients actifs" },
  { to: "/ncc/iptv/renewals",      label: "Renouvellements" },
  { to: "/ncc/iptv/providers",     label: "Fournisseurs" },
  { to: "/ncc/iptv/history",       label: "Historique imports" },
];

function IptvLayout() {
  const { pathname } = useLocation();
  return (
    <div>
      <NccPageHeader icon={Tv2} title="IPTV Manager" description="Moteur d'automatisation IPTV — comptes, fournisseurs, abonnements, journaux." />
      <div className="mb-6 overflow-x-auto border-b border-border">
        <nav className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors " +
                (active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
              }>{t.label}</Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}