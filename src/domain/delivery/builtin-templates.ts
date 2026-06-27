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

export function getTemplate(id: string): DeliveryTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}