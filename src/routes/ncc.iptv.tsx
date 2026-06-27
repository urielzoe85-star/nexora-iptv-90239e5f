import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Tv2 } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";

export const Route = createFileRoute("/ncc/iptv")({ component: IptvLayout });

const TABS = [
  { to: "/ncc/iptv",               label: "Dashboard",     exact: true },
  { to: "/ncc/iptv/accounts",      label: "Comptes IPTV" },
  { to: "/ncc/iptv/trials",        label: "Essais gratuits" },
  { to: "/ncc/iptv/premium",       label: "Premium" },
  { to: "/ncc/iptv/renewals",      label: "Renouvellements" },
  { to: "/ncc/iptv/suspended",     label: "Suspendus" },
  { to: "/ncc/iptv/expired",       label: "Expirés" },
  { to: "/ncc/iptv/subscriptions", label: "Abonnements" },
  { to: "/ncc/iptv/providers",     label: "Fournisseurs" },
  { to: "/ncc/iptv/history",       label: "Historique" },
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