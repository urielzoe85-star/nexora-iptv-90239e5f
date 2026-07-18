import type { DeliveryTemplate } from "./message-engine";

export const BUILTIN_TEMPLATES: DeliveryTemplate[] = [
  {
    id: "fr_standard",
    name: "Français — Standard",
    channel: "any",
    language: "fr",
    subject: "Vos accès NEXORA IPTV — {{order_ref}}",
    body:
`Bonjour {{client_name}},

Merci pour votre commande {{order_ref}}.
Voici vos accès pour {{product_name}} :

• Username : {{username}}
• Password : {{password}}
• Package : {{package}}
• DNS : {{dns}}
• Connexions max : {{max_connections}}
• Expiration : {{expiration_date}}

Pour toute question, répondez simplement à ce message.
Bonne diffusion !
— L'équipe NEXORA`,
  },
  {
    id: "en_standard",
    name: "English — Standard",
    channel: "any",
    language: "en",
    subject: "Your NEXORA IPTV credentials — {{order_ref}}",
    body:
`Hello {{client_name}},

Thank you for your order {{order_ref}}.
Here are your credentials for {{product_name}}:

• Username: {{username}}
• Password: {{password}}
• Package: {{package}}
• DNS: {{dns}}
• Max connections: {{max_connections}}
• Expires on: {{expiration_date}}

Reply to this message if you need anything.
Enjoy!
— The NEXORA Team`,
  },
  {
    id: "short",
    name: "Court",
    channel: "any",
    language: "fr",
    subject: "Vos accès IPTV",
    body:
`{{client_name}}, vos accès :
User : {{username}}
Pass : {{password}}
DNS  : {{dns}}
Exp. : {{expiration_date}}`,
  },
  {
    id: "professional",
    name: "Professionnel",
    channel: "any",
    language: "fr",
    subject: "NEXORA — Activation de votre abonnement {{product_name}}",
    body:
`Bonjour {{client_name}},

Votre abonnement {{product_name}} (commande {{order_ref}}) a été activé.

Identifiants d'accès :
— Username       : {{username}}
— Password       : {{password}}
— Package        : {{package}}
— DNS principal  : {{dns}}
— DNS Samsung/LG : {{dns_samsung_lg}}
— Portail        : {{portal_link}}
— Connexions max : {{max_connections}}
— Expiration     : {{expiration_date}}

Notre support reste à votre disposition.
Cordialement,
L'équipe NEXORA`,
  },
  {
    id: "vip",
    name: "VIP",
    channel: "any",
    language: "fr",
    subject: "🌟 Vos accès VIP NEXORA",
    body:
`Bonjour {{client_name}} 🌟

Bienvenue dans l'expérience VIP NEXORA.
Votre abonnement {{product_name}} est prêt :

🔐 Username : {{username}}
🔑 Password : {{password}}
📺 Package  : {{package}}
🌐 DNS      : {{dns}}
👥 Devices  : {{max_connections}}
📅 Validité : jusqu'au {{expiration_date}}

Un conseiller VIP vous accompagne 7j/7.
— NEXORA VIP`,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Templates de relance (bulk) — livraison, renouvellement, paiement.
// Chaque template a une clé `scenario` pour le filtrage dans la page bulk.
// ────────────────────────────────────────────────────────────────────────────
export type BulkScenario = "delivery" | "renewal" | "payment_reminder";
export type BulkScenarioExt = BulkScenario | "marketing" | "custom";

export interface BulkTemplate extends DeliveryTemplate {
  scenario: BulkScenario;
}

export const BULK_TEMPLATES: BulkTemplate[] = [
  // ── LIVRAISON ────────────────────────────────────────────────────────────
  {
    id: "delivery_fr",
    name: "Livraison — FR",
    scenario: "delivery",
    channel: "any",
    language: "fr",
    subject: "Vos accès NEXORA IPTV — {{order_ref}}",
    body:
`Bonjour {{client_name}} 👋

Voici (ou re-voici) vos accès NEXORA IPTV pour {{product_name}} :

🔐 Username : {{username}}
🔑 Password : {{password}}
🌐 DNS      : {{dns}}
📅 Expire le : {{expiration_date}}
👥 Connexions max : {{max_connections}}

Portail client : {{portal_link}}

Une question ? Répondez à ce message, notre équipe vous répond.
— L'équipe NEXORA`,
  },
  {
    id: "delivery_en",
    name: "Delivery — EN",
    scenario: "delivery",
    channel: "any",
    language: "en",
    subject: "Your NEXORA IPTV credentials — {{order_ref}}",
    body:
`Hi {{client_name}} 👋

Here are your NEXORA IPTV credentials for {{product_name}}:

🔐 Username: {{username}}
🔑 Password: {{password}}
🌐 DNS:      {{dns}}
📅 Expires:  {{expiration_date}}
👥 Max devices: {{max_connections}}

Client portal: {{portal_link}}

Reply to this message if you need any help.
— The NEXORA Team`,
  },

  // ── RENOUVELLEMENT ──────────────────────────────────────────────────────
  {
    id: "renewal_j7_fr",
    name: "Renouvellement J-7 — FR",
    scenario: "renewal",
    channel: "any",
    language: "fr",
    subject: "Votre abonnement NEXORA expire dans {{days_left}} jours",
    body:
`Bonjour {{client_name}},

Votre abonnement {{product_name}} arrive à échéance le {{expiration_date}} (dans {{days_left}} jours).

Pour éviter toute coupure, renouvelez dès maintenant :
👉 {{renew_url}}

Compte concerné : {{username}}

Merci de votre confiance !
— L'équipe NEXORA`,
  },
  {
    id: "renewal_j3_fr",
    name: "Renouvellement J-3 — FR",
    scenario: "renewal",
    channel: "any",
    language: "fr",
    subject: "⏰ Plus que {{days_left}} jours avant coupure — NEXORA IPTV",
    body:
`Bonjour {{client_name}},

⏰ Rappel important : votre abonnement {{product_name}} expire le {{expiration_date}} (dans {{days_left}} jours seulement).

Renouvelez en 1 clic : {{renew_url}}

Compte : {{username}}

— NEXORA`,
  },
  {
    id: "renewal_j1_fr",
    name: "Renouvellement J-1 — FR",
    scenario: "renewal",
    channel: "any",
    language: "fr",
    subject: "🚨 Dernière chance — votre IPTV expire demain",
    body:
`{{client_name}}, dernière alerte 🚨

Votre abonnement {{product_name}} ({{username}}) expire DEMAIN ({{expiration_date}}).

Renouvelez maintenant pour éviter la coupure :
👉 {{renew_url}}

— NEXORA`,
  },
  {
    id: "renewal_j7_en",
    name: "Renewal J-7 — EN",
    scenario: "renewal",
    channel: "any",
    language: "en",
    subject: "Your NEXORA subscription expires in {{days_left}} days",
    body:
`Hi {{client_name}},

Your {{product_name}} subscription expires on {{expiration_date}} (in {{days_left}} days).

Renew now to avoid any interruption:
👉 {{renew_url}}

Account: {{username}}

— The NEXORA Team`,
  },

  // ── RELANCE PAIEMENT ────────────────────────────────────────────────────
  {
    id: "payment_reminder_fr",
    name: "Relance paiement — FR",
    scenario: "payment_reminder",
    channel: "any",
    language: "fr",
    subject: "Votre commande {{order_ref}} est en attente de paiement",
    body:
`Bonjour {{client_name}},

Nous avons bien reçu votre commande {{order_ref}} ({{product_name}}) — {{amount_due}} {{currency}} — mais le paiement n'est pas encore confirmé.

Finalisez votre paiement pour activer votre abonnement :
👉 {{payment_url}}

Si vous avez déjà payé, ignorez ce message ou envoyez-nous la preuve.
— L'équipe NEXORA`,
  },
  {
    id: "payment_reminder_final_fr",
    name: "Relance paiement — Dernier rappel FR",
    scenario: "payment_reminder",
    channel: "any",
    language: "fr",
    subject: "⏳ Dernier rappel — commande {{order_ref}}",
    body:
`{{client_name}},

⏳ Votre commande {{order_ref}} attend toujours votre paiement ({{amount_due}} {{currency}}).
Elle sera annulée automatiquement dans 24 h.

Payez maintenant : {{payment_url}}

— NEXORA`,
  },
  {
    id: "payment_reminder_en",
    name: "Payment reminder — EN",
    scenario: "payment_reminder",
    channel: "any",
    language: "en",
    subject: "Your order {{order_ref}} is awaiting payment",
    body:
`Hi {{client_name}},

We received your order {{order_ref}} ({{product_name}}) — {{amount_due}} {{currency}} — but payment is not confirmed yet.

Complete your payment to activate your subscription:
👉 {{payment_url}}

If you already paid, please ignore or reply with the proof.
— The NEXORA Team`,
  },

  // ── MARKETING / PROMO COMMERCIALE ────────────────────────────────────────
  {
    id: "marketing_promo_fr",
    name: "Promo saisonnière — FR",
    scenario: "marketing" as BulkScenario,
    channel: "any",
    language: "fr",
    subject: "🎁 Offre spéciale NEXORA IPTV — jusqu'à -30 %",
    body:
`Bonjour {{client_name}} 👋

Profitez de notre offre spéciale sur NEXORA IPTV :
✅ +20 000 chaînes HD/4K
✅ VOD, séries & sport premium
✅ Jusqu'à -30 % sur les abonnements 6 et 12 mois

👉 Commandez ici : {{portal_link}}

Une question ? Répondez à ce message, on vous accompagne.
— L'équipe NEXORA`,
  },
  {
    id: "marketing_upsell_fr",
    name: "Upsell VIP — FR",
    scenario: "marketing" as BulkScenario,
    channel: "any",
    language: "fr",
    subject: "🌟 Passez à l'expérience NEXORA VIP",
    body:
`Bonjour {{client_name}},

En tant que client fidèle, vous êtes éligible à notre offre VIP :
🌟 Multi-écrans (jusqu'à 5 devices)
🌟 Support prioritaire 7j/7
🌟 Chaînes premium exclusives

Découvrir : {{portal_link}}

— L'équipe NEXORA`,
  },
  {
    id: "marketing_winback_fr",
    name: "Réactivation ex-client — FR",
    scenario: "marketing" as BulkScenario,
    channel: "any",
    language: "fr",
    subject: "On vous a manqué chez NEXORA 💙",
    body:
`Bonjour {{client_name}},

Cela fait un moment que vous n'avez pas renouvelé votre abonnement NEXORA IPTV.
Bonne nouvelle : nous vous offrons -20 % sur votre prochain abonnement.

👉 Réactivez ici : {{renew_url}}

À très vite,
— L'équipe NEXORA`,
  },
  {
    id: "marketing_promo_en",
    name: "Seasonal promo — EN",
    scenario: "marketing" as BulkScenario,
    channel: "any",
    language: "en",
    subject: "🎁 NEXORA IPTV special offer — up to 30% off",
    body:
`Hi {{client_name}} 👋

Enjoy our special offer on NEXORA IPTV:
✅ 20,000+ HD/4K channels
✅ VOD, series & premium sports
✅ Up to 30% off on 6 and 12-month plans

👉 Order here: {{portal_link}}

Reply if you need help.
— The NEXORA Team`,
  },
  {
    id: "marketing_new_catalog_fr",
    name: "Nouveautés catalogue — FR",
    scenario: "marketing" as BulkScenario,
    channel: "any",
    language: "fr",
    subject: "🆕 Nouveautés NEXORA IPTV cette semaine",
    body:
`Bonjour {{client_name}},

Nouveautés du catalogue NEXORA IPTV :
🎬 Nouveaux films & séries en VOD
⚽ Toutes les compétitions live
📺 Nouvelles chaînes ajoutées

Découvrez tout : {{portal_link}}

— NEXORA`,
  },
];

export function getBulkTemplate(id: string): BulkTemplate | undefined {
  return BULK_TEMPLATES.find((t) => t.id === id);
}

export function getTemplate(id: string): DeliveryTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}