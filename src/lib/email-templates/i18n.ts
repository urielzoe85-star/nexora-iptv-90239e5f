// Sprint 3 · Bloc A — minimal i18n dictionary for transactional email
// templates. Keep it tiny and dependency-free; the shared `t()` helper
// picks the recipient locale (fallback: "fr") and returns a straight
// string, so React Email templates stay pure.

export type Locale = "fr" | "en";

type Dict = Record<string, Record<Locale, string>>;

const dict: Dict = {
  "renewal.preview":       { fr: "Votre abonnement expire bientôt",              en: "Your subscription expires soon" },
  "renewal.title.j7":      { fr: "Votre abonnement expire dans 7 jours",         en: "Your subscription expires in 7 days" },
  "renewal.title.j3":      { fr: "Votre abonnement expire dans 3 jours",         en: "Your subscription expires in 3 days" },
  "renewal.title.j1":      { fr: "Dernier rappel — expiration demain",           en: "Last reminder — expires tomorrow" },
  "renewal.hi":            { fr: "Bonjour",                                       en: "Hi" },
  "renewal.body":          { fr: "Votre abonnement IPTV arrive à échéance.",     en: "Your IPTV subscription is about to expire." },
  "renewal.expires":       { fr: "Date d'expiration",                             en: "Expiration date" },
  "renewal.username":      { fr: "Identifiant",                                   en: "Username" },
  "renewal.cta":           { fr: "Renouveler maintenant",                         en: "Renew now" },
  "renewal.footer":        { fr: "— L'équipe Nexora IPTV",                        en: "— The Nexora IPTV team" },
  "dunning.preview":       { fr: "Paiement en attente",                           en: "Payment pending" },
  "dunning.title.j1":      { fr: "Paiement échoué — action requise",              en: "Payment failed — action required" },
  "dunning.title.j3":      { fr: "Rappel : paiement en attente depuis 3 jours",   en: "Reminder: payment pending for 3 days" },
  "dunning.title.j7":      { fr: "Dernier avis — suspension imminente",           en: "Final notice — suspension imminent" },
  "dunning.body":          { fr: "Nous n'avons pas pu confirmer votre paiement.", en: "We couldn't confirm your payment." },
  "dunning.ref":           { fr: "Référence commande",                            en: "Order reference" },
  "dunning.cta":           { fr: "Régler mon paiement",                           en: "Pay now" },
  "dunning.suspend.warn":  { fr: "Sans règlement, votre service sera suspendu.",  en: "Without payment, your service will be suspended." },
};

export function pickLocale(input?: string | null): Locale {
  const v = (input ?? "").toString().toLowerCase();
  return v.startsWith("en") ? "en" : "fr";
}

export function t(key: string, locale: Locale): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[locale] ?? entry.fr ?? key;
}