import type { LucideIcon } from "lucide-react";
import {
  Building2, CreditCard, Tv2, MessageCircle, Send, Mail, Search,
  Shield, UserCog, KeyRound, DatabaseBackup,
} from "lucide-react";

export type FieldType = "text" | "textarea" | "email" | "url" | "number" | "password" | "switch";

export type SettingField = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  rows?: number;
};

export type SettingCard = {
  /** site_settings row key */
  key: string;
  title: string;
  description?: string;
  fields: SettingField[];
};

export type SettingsSection = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Cards form the section (each maps to a site_settings row). */
  cards?: SettingCard[];
  /** Optional shortcut link instead of a form. */
  shortcut?: { label: string; to: string; description: string };
};

export const SETTINGS_SECTIONS_META: SettingsSection[] = [
  {
    id: "company",
    label: "Entreprise",
    description: "Informations légales et identité affichées sur le site public.",
    icon: Building2,
    cards: [
      {
        key: "company",
        title: "Identité",
        description: "Nom commercial, entité légale et coordonnées principales.",
        fields: [
          { name: "brand", label: "Nom commercial", type: "text", placeholder: "Nexora IPTV" },
          { name: "legal_name", label: "Raison sociale", type: "text" },
          { name: "tagline", label: "Slogan", type: "text" },
          { name: "address", label: "Adresse", type: "textarea", rows: 2 },
          { name: "vat_number", label: "Numéro TVA / SIREN", type: "text" },
        ],
      },
      {
        key: "contact",
        title: "Coordonnées",
        description: "Comment les clients vous joignent (utilisé aussi sur le site).",
        fields: [
          { name: "email", label: "Email support", type: "email" },
          { name: "whatsapp", label: "WhatsApp", type: "text", help: "Format international, ex : +33612345678" },
          { name: "telegram", label: "Telegram", type: "text", placeholder: "@nexora_support" },
          { name: "phone", label: "Téléphone", type: "text" },
        ],
      },
      {
        key: "social",
        title: "Réseaux sociaux",
        fields: [
          { name: "facebook", label: "Facebook", type: "url" },
          { name: "instagram", label: "Instagram", type: "url" },
          { name: "twitter", label: "X / Twitter", type: "url" },
          { name: "youtube", label: "YouTube", type: "url" },
          { name: "tiktok", label: "TikTok", type: "url" },
        ],
      },
    ],
  },
  {
    id: "payments",
    label: "Paiements",
    description: "Fournisseurs de paiement, devise et politique de facturation.",
    icon: CreditCard,
    cards: [
      {
        key: "payments_general",
        title: "Général",
        fields: [
          { name: "currency", label: "Devise (ISO 4217)", type: "text", placeholder: "EUR" },
          { name: "min_amount", label: "Montant minimum accepté", type: "number" },
          { name: "max_amount", label: "Montant maximum accepté", type: "number" },
          { name: "auto_capture", label: "Capture automatique", type: "switch" },
        ],
      },
      {
        key: "payments_providers",
        title: "Fournisseurs activés",
        description: "Active/désactive les moyens de paiement affichés au checkout.",
        fields: [
          { name: "sebpay", label: "SebPay (carte)", type: "switch" },
          { name: "binance", label: "Binance Pay (crypto)", type: "switch" },
          { name: "stripe", label: "Stripe", type: "switch" },
          { name: "paypal", label: "PayPal", type: "switch" },
          { name: "wero", label: "Wero / Wallet", type: "switch" },
        ],
      },
      {
        key: "payments_binance",
        title: "Binance Pay",
        description: "Adresse marchande utilisée pour la vérification manuelle.",
        fields: [
          { name: "merchant_id", label: "Merchant ID", type: "text" },
          { name: "wallet_address", label: "Adresse wallet", type: "text" },
          { name: "qr_url", label: "URL du QR code public", type: "url" },
        ],
      },
    ],
  },
  {
    id: "iptv",
    label: "IPTV",
    description: "Fournisseurs IPTV, paramètres par défaut et politique de renouvellement.",
    icon: Tv2,
    cards: [
      {
        key: "iptv_defaults",
        title: "Valeurs par défaut",
        fields: [
          { name: "default_provider", label: "Fournisseur par défaut", type: "text", placeholder: "megaott" },
          { name: "default_duration_days", label: "Durée par défaut (jours)", type: "number", placeholder: "30" },
          { name: "default_country", label: "Pays par défaut (ISO2)", type: "text", placeholder: "FR" },
          { name: "auto_provision", label: "Provisionnement automatique après paiement", type: "switch" },
        ],
      },
      {
        key: "iptv_renewal",
        title: "Renouvellements",
        fields: [
          { name: "reminder_days_before", label: "Rappel avant expiration (jours)", type: "number", placeholder: "7" },
          { name: "grace_period_days", label: "Période de grâce (jours)", type: "number", placeholder: "3" },
          { name: "auto_suspend", label: "Suspension automatique après expiration", type: "switch" },
        ],
      },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Configuration du canal WhatsApp Business (numéro affiché et webhooks).",
    icon: MessageCircle,
    cards: [
      {
        key: "whatsapp",
        title: "Canal WhatsApp",
        fields: [
          { name: "display_number", label: "Numéro affiché aux clients", type: "text", placeholder: "+33 6 12 34 56 78" },
          { name: "phone_number_id", label: "Phone Number ID (Meta)", type: "text" },
          { name: "business_account_id", label: "WABA ID", type: "text" },
          { name: "welcome_message", label: "Message d'accueil", type: "textarea", rows: 3 },
          { name: "enabled", label: "Canal actif", type: "switch" },
        ],
      },
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Bot Telegram utilisé pour livraisons et notifications.",
    icon: Send,
    cards: [
      {
        key: "telegram",
        title: "Bot Telegram",
        fields: [
          { name: "bot_username", label: "Nom du bot", type: "text", placeholder: "@nexora_bot" },
          { name: "support_channel", label: "Canal support (URL)", type: "url" },
          { name: "broadcast_channel_id", label: "Chat ID diffusion", type: "text" },
          { name: "enabled", label: "Canal actif", type: "switch" },
        ],
      },
    ],
  },
  {
    id: "emails",
    label: "Emails",
    description: "Expéditeur transactionnel, DKIM et préférences des notifications.",
    icon: Mail,
    cards: [
      {
        key: "emails",
        title: "Emails transactionnels",
        fields: [
          { name: "from_name", label: "Nom expéditeur", type: "text", placeholder: "Nexora IPTV" },
          { name: "from_email", label: "Adresse expéditeur", type: "email", placeholder: "no-reply@nexora-iptv.com" },
          { name: "reply_to", label: "Reply-To", type: "email" },
          { name: "footer", label: "Pied de page", type: "textarea", rows: 3 },
          { name: "send_receipts", label: "Envoyer un reçu après paiement", type: "switch" },
          { name: "send_renewal_reminders", label: "Rappels de renouvellement", type: "switch" },
        ],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    description: "Métadonnées globales appliquées aux pages publiques.",
    icon: Search,
    cards: [
      {
        key: "seo",
        title: "Métadonnées globales",
        fields: [
          { name: "site_title", label: "Titre du site", type: "text" },
          { name: "site_description", label: "Description", type: "textarea", rows: 3 },
          { name: "og_image_url", label: "Image OpenGraph (URL absolue)", type: "url" },
          { name: "twitter_handle", label: "Handle Twitter", type: "text", placeholder: "@nexora" },
          { name: "gsc_verification", label: "Google Search Console (meta)", type: "text" },
          { name: "gtag_id", label: "Google Analytics (G-XXXX)", type: "text" },
          { name: "noindex", label: "Bloquer l'indexation (noindex global)", type: "switch" },
        ],
      },
    ],
  },
  {
    id: "security",
    label: "Sécurité",
    description: "Sessions, protection anti-fraude et journal d'audit.",
    icon: Shield,
    cards: [
      {
        key: "security",
        title: "Sessions & accès",
        fields: [
          { name: "session_timeout_minutes", label: "Timeout session admin (minutes)", type: "number", placeholder: "60" },
          { name: "ncc_gate_ttl_minutes", label: "Durée du 2ᵉ facteur NCC (minutes)", type: "number", placeholder: "120" },
          { name: "ip_allowlist", label: "Liste blanche IP (une par ligne)", type: "textarea", rows: 4 },
          { name: "require_2fa_admins", label: "Exiger 2FA pour les admins", type: "switch" },
          { name: "audit_retention_days", label: "Rétention journal d'audit (jours)", type: "number", placeholder: "90" },
        ],
      },
    ],
  },
  {
    id: "users",
    label: "Utilisateurs",
    description: "Comptes internes, rôles et permissions.",
    icon: UserCog,
    shortcut: {
      label: "Ouvrir la gestion des employés",
      to: "/ncc/employees",
      description: "La gestion des comptes internes se fait depuis le module Employés.",
    },
  },
  {
    id: "api",
    label: "API",
    description: "Clés API sortantes, webhooks et intégrations tierces.",
    icon: KeyRound,
    cards: [
      {
        key: "api",
        title: "API publique",
        fields: [
          { name: "enabled", label: "API publique activée", type: "switch" },
          { name: "rate_limit_per_minute", label: "Rate limit (req/min)", type: "number", placeholder: "60" },
          { name: "cors_origins", label: "Origines CORS autorisées (une par ligne)", type: "textarea", rows: 3 },
          { name: "webhook_default_url", label: "Webhook sortant par défaut", type: "url" },
          { name: "webhook_signing_secret_id", label: "ID du secret de signature", type: "text", help: "Le secret réel est stocké dans le coffre de secrets." },
        ],
      },
    ],
  },
  {
    id: "backups",
    label: "Sauvegardes",
    description: "Fréquence des snapshots et politique de rétention.",
    icon: DatabaseBackup,
    cards: [
      {
        key: "backups",
        title: "Politique de sauvegarde",
        fields: [
          { name: "enabled", label: "Sauvegardes automatiques", type: "switch" },
          { name: "frequency_hours", label: "Fréquence (heures)", type: "number", placeholder: "24" },
          { name: "retention_days", label: "Rétention (jours)", type: "number", placeholder: "30" },
          { name: "notify_email", label: "Alerter cet email en cas d'échec", type: "email" },
          { name: "integrity_check", label: "Vérification d'intégrité après chaque sauvegarde", type: "switch" },
        ],
      },
    ],
  },
];

export function getSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS_META.find((s) => s.id === id);
}