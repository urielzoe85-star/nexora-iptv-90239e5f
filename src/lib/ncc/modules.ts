import {
  LayoutDashboard, Users, Package, ShoppingBag, CreditCard, Tv2, Gift,
  Bot, MessageCircle, Send, Mail, Bell, LifeBuoy, BarChart3, UserCog, Workflow,
  ScrollText, Settings, UserCircle, Images, Megaphone,
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
  { id: "analytics", label: "Analytics", description: "Indicateurs de performance et tendances.", icon: BarChart3, to: "/ncc/analytics", group: "cockpit", status: "ready" },
  { id: "logs", label: "Journal système", description: "Tous les événements de la plateforme.", icon: ScrollText, to: "/ncc/logs", group: "cockpit", status: "ready" },

  { id: "clients", label: "Clients", description: "Base clients unifiée et CRM léger.", icon: Users, to: "/ncc/clients", group: "sales", status: "ready" },
  { id: "products", label: "Produits", description: "Catalogue, plans et bundles.", icon: Package, to: "/ncc/products", group: "sales", status: "ready" },
  { id: "orders", label: "Commandes", description: "Suivi global des commandes.", icon: ShoppingBag, to: "/ncc/orders", group: "sales", status: "ready" },
  { id: "payments", label: "Paiements", description: "Transactions, réconciliations, payouts.", icon: CreditCard, to: "/ncc/payments", group: "sales", status: "ready" },
  { id: "payments-binance", label: "Paiements Binance", description: "Vérification manuelle des paiements Binance Pay (QR).", icon: CreditCard, to: "/ncc/payments/binance", group: "sales", status: "ready" },
  { id: "trials", label: "Essais gratuits", description: "Gestion des comptes de démonstration.", icon: Gift, to: "/ncc/trials", group: "sales", status: "ready" },
  { id: "gallery", label: "Galerie photos", description: "Photos produits liées aux plans et pages produit (SEO Google Merchant).", icon: Images, to: "/ncc/gallery", group: "sales", status: "ready" },

  { id: "iptv", label: "IPTV Manager", description: "Abonnements IPTV, lignes, renouvellements.", icon: Tv2, to: "/ncc/iptv", group: "services", status: "ready" },
  { id: "bots", label: "Bots", description: "Orchestration des assistants automatisés.", icon: Bot, to: "/ncc/bots", group: "services", status: "ready" },
  { id: "notifications", label: "Notifications", description: "Centre multi-canal (email, WhatsApp, Telegram, SMS, in-app).", icon: Bell, to: "/ncc/notifications", group: "services", status: "ready" },
  { id: "whatsapp", label: "WhatsApp", description: "Conversations & campagnes WhatsApp.", icon: MessageCircle, to: "/ncc/whatsapp", group: "services", status: "ready" },
  { id: "telegram", label: "Telegram", description: "Bots et diffusions Telegram.", icon: Send, to: "/ncc/telegram", group: "services", status: "ready" },
  { id: "emails", label: "Emails", description: "Historique des emails transactionnels.", icon: Mail, to: "/ncc/emails", group: "services", status: "ready" },
  { id: "bulk", label: "Envoi en masse", description: "Relance par lot (livraison, renouvellement, paiement) — WhatsApp, Telegram, Email.", icon: Megaphone, to: "/ncc/bulk", group: "services", status: "ready" },

  { id: "support", label: "Support", description: "Tickets et helpdesk client.", icon: LifeBuoy, to: "/ncc/support", group: "ops", status: "ready" },
  { id: "employees", label: "Employés", description: "Comptes internes, rôles, permissions.", icon: UserCog, to: "/ncc/employees", group: "ops", status: "ready" },
  { id: "automation", label: "Automatisation", description: "Workflows, déclencheurs, file d'attente et historique.", icon: Workflow, to: "/ncc/automation", group: "ops", status: "ready" },
  { id: "portal", label: "Espace client", description: "Offres de renouvellement, annonces, sessions du portail.", icon: UserCircle, to: "/ncc/portal", group: "ops", status: "ready" },

  { id: "settings", label: "Paramètres", description: "Configuration globale de la plateforme.", icon: Settings, to: "/ncc/settings", group: "system", status: "ready" },
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
