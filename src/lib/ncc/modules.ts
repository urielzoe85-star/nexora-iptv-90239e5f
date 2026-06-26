import {
  LayoutDashboard, Users, Package, ShoppingBag, CreditCard, Tv2, Gift,
  Bot, MessageCircle, Send, Mail, LifeBuoy, BarChart3, UserCog, Workflow,
  ScrollText, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleStatus = "ready" | "preparing";
export type ModuleGroup = "cockpit" | "sales" | "services" | "ops" | "system";

export type NccModule = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  to: string;
  group: ModuleGroup;
  status: ModuleStatus;
  upcoming?: string[];
};

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  cockpit: "Cockpit",
  sales: "Ventes",
  services: "Services",
  ops: "Opérations",
  system: "Système",
};

export const NCC_MODULES: NccModule[] = [
  { id: "dashboard", label: "Dashboard", description: "Vue d'ensemble en temps réel de l'activité.", icon: LayoutDashboard, to: "/ncc", group: "cockpit", status: "ready" },
  { id: "analytics", label: "Analytics", description: "Indicateurs de performance et tendances.", icon: BarChart3, to: "/ncc/analytics", group: "cockpit", status: "preparing", upcoming: ["Cohortes & rétention", "Funnel de conversion", "Sources de trafic"] },
  { id: "logs", label: "Journal système", description: "Tous les événements de la plateforme.", icon: ScrollText, to: "/ncc/logs", group: "cockpit", status: "preparing" },

  { id: "clients", label: "Clients", description: "Base clients unifiée et CRM léger.", icon: Users, to: "/ncc/clients", group: "sales", status: "preparing", upcoming: ["Fiches clients enrichies", "Segmentation", "Historique multi-canal"] },
  { id: "products", label: "Produits", description: "Catalogue, plans et bundles.", icon: Package, to: "/ncc/products", group: "sales", status: "preparing", upcoming: ["Bundles personnalisés", "Tarification dynamique", "Gestion des promos"] },
  { id: "orders", label: "Commandes", description: "Suivi global des commandes.", icon: ShoppingBag, to: "/ncc/orders", group: "sales", status: "preparing", upcoming: ["Vue Kanban", "Annulations & remboursements", "Export comptable"] },
  { id: "payments", label: "Paiements", description: "Transactions, réconciliations, payouts.", icon: CreditCard, to: "/ncc/payments", group: "sales", status: "preparing", upcoming: ["Multi-passerelles", "Disputes", "Rapprochement bancaire"] },
  { id: "trials", label: "Essais gratuits", description: "Gestion des comptes de démonstration.", icon: Gift, to: "/ncc/trials", group: "sales", status: "preparing", upcoming: ["Génération automatique", "Expiration & relance", "Conversion tracking"] },

  { id: "iptv", label: "IPTV Manager", description: "Lignes, serveurs, MEGAOTT, Xtream.", icon: Tv2, to: "/ncc/iptv", group: "services", status: "preparing", upcoming: ["Création de ligne", "Renouvellements auto", "Multi-panel"] },
  { id: "bots", label: "Bots", description: "Orchestration des assistants automatisés.", icon: Bot, to: "/ncc/bots", group: "services", status: "preparing" },
  { id: "whatsapp", label: "WhatsApp", description: "Conversations & campagnes WhatsApp.", icon: MessageCircle, to: "/ncc/whatsapp", group: "services", status: "preparing", upcoming: ["Inbox unifiée", "Templates approuvés", "Broadcasts"] },
  { id: "telegram", label: "Telegram", description: "Bots et diffusions Telegram.", icon: Send, to: "/ncc/telegram", group: "services", status: "preparing" },
  { id: "emails", label: "Emails", description: "Campagnes et transactionnels.", icon: Mail, to: "/ncc/emails", group: "services", status: "preparing", upcoming: ["Éditeur visuel", "Listes & segments", "Tracking d'ouverture"] },

  { id: "support", label: "Support", description: "Tickets et helpdesk client.", icon: LifeBuoy, to: "/ncc/support", group: "ops", status: "preparing" },
  { id: "employees", label: "Employés", description: "Comptes internes, rôles, permissions.", icon: UserCog, to: "/ncc/employees", group: "ops", status: "preparing" },
  { id: "automation", label: "Automatisation", description: "Workflows et déclencheurs.", icon: Workflow, to: "/ncc/automation", group: "ops", status: "preparing", upcoming: ["Constructeur visuel", "Triggers DB", "Actions multi-canal"] },

  { id: "settings", label: "Paramètres", description: "Configuration globale de la plateforme.", icon: Settings, to: "/ncc/settings", group: "system", status: "preparing" },
];

export const SETTINGS_SECTIONS = [
  { id: "company", label: "Entreprise" },
  { id: "payments", label: "Paiements" },
  { id: "iptv", label: "IPTV" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "emails", label: "Emails" },
  { id: "seo", label: "SEO" },
  { id: "security", label: "Sécurité" },
  { id: "users", label: "Utilisateurs" },
  { id: "api", label: "API" },
  { id: "backups", label: "Sauvegardes" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function getModule(id: string): NccModule | undefined {
  return NCC_MODULES.find((m) => m.id === id);
}
