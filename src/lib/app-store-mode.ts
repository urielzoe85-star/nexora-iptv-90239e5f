/**
 * App Store Review Mode
 * ---------------------
 * Build-time flag qui active un rendu neutralisé du site public UNIQUEMENT
 * lorsque servi depuis le domaine soumis à Apple (ex. app.nexora-iptv.com).
 *
 * - Flag OFF (défaut) → aucun impact, zéro régression sur nexora-iptv.com ni le NCC.
 * - Flag ON  → dictionnaire de sanitisation appliqué au DOM + routes sensibles
 *              redirigées vers l'accueil.
 *
 * Activation : `VITE_APP_STORE_MODE=1` au build du sous-domaine `app.`.
 */

export function isAppStoreMode(): boolean {
  try {
    return import.meta.env.VITE_APP_STORE_MODE === "1"
      || import.meta.env.VITE_APP_STORE_MODE === "true";
  } catch {
    return false;
  }
}

/**
 * Dictionnaire de remplacement — appliqué au texte visible dans le DOM.
 * Ordre = du plus long au plus court pour éviter les remplacements partiels.
 */
export const SANITIZE_DICT: Array<[RegExp, string]> = [
  // Marque principale
  [/\bNexora\s*IPTV\b/gi, "Nexora"],
  [/\bIPTV\s*Premium\b/gi, "Premium"],
  [/\bIPTV\b/gi, "streaming"],

  // Termes techniques bloqués par Apple
  [/\bM3U8?\b/gi, "playlist"],
  [/\bXtream(?:\s*Codes?)?\b/gi, "compte"],
  [/\bEPG\b/g, "programme"],
  [/\bMAG\s*Box\b/gi, "boîtier"],
  [/\bSmarters?\s*Pro\b/gi, "lecteur compatible"],
  [/\bTiviMate\b/gi, "lecteur compatible"],
  [/\bM-?IBO(?:\s*Player)?\b/gi, "lecteur compatible"],
  [/\bGSE\s*Smart\s*IPTV\b/gi, "lecteur compatible"],

  // Contenu
  [/\bchaînes?\s+TV\s+live\b/gi, "flux multimédia"],
  [/\bchaînes?\s+live\b/gi, "flux live"],
  [/\bchaînes?\s+TV\b/gi, "contenus"],
  [/\bchannels?\s+live\b/gi, "live media"],
  [/\blive\s+TV\s+channels?\b/gi, "live media"],
  [/\bTV\s+channels?\b/gi, "media"],
  [/\bbouquets?\b/gi, "collections"],

  // Offres
  [/\babonnement\s+IPTV\b/gi, "abonnement premium"],
  [/\bIPTV\s+subscription\b/gi, "premium subscription"],
  [/\bIPTV\s+reseller\b/gi, "partner program"],
  [/\brevendeur\s+IPTV\b/gi, "partenaire"],

  // Marques protégées
  [/\bCanal\+?\b/g, ""],
  [/\bbeIN(?:\s*Sports?)?\b/gi, ""],
  [/\bSky\s*Sports?\b/gi, ""],
  [/\bDAZN\b/g, ""],
  [/\bNetflix\b/g, ""],
  [/\bDisney\+?\b/g, ""],
  [/\bPrime\s*Video\b/gi, ""],
  [/\bHBO(?:\s*Max)?\b/gi, ""],
];

/**
 * Applique le dictionnaire à une chaîne. Utilisé par le MutationObserver
 * pour réécrire les Text nodes à la volée.
 */
export function sanitize(text: string): string {
  if (!text || !text.trim()) return text;
  let out = text;
  for (const [re, repl] of SANITIZE_DICT) out = out.replace(re, repl);
  // Nettoyage double-espace après suppression de marques.
  return out.replace(/[ \t]{2,}/g, " ");
}

/**
 * Routes cachées à Apple. Toute navigation vers l'une d'elles est redirigée
 * vers l'accueil (ou une page équivalente neutre).
 */
const BLOCKED_ROUTE_PATTERNS: RegExp[] = [
  /^\/produits(\/|$)/i,
  /^\/reseller(\/|$)/i,
  /^\/(fr|en|de)\/produits(\/|$)/i,
  /^\/(fr|en|de)\/reseller(\/|$)/i,
  /^\/(fr|en|de)\/guide-iptv(\/|$)/i,
  /^\/espace-client\/downloads(\/|$)/i,
  /^\/gallery(\/|$)/i,
];

export function isRouteBlocked(pathname: string): boolean {
  return BLOCKED_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

/** Copies neutres exposées aux composants qui veulent s'y adapter. */
export const APP_STORE_COPY = {
  brand: "Nexora",
  tagline: {
    fr: "Nexora — votre espace personnel premium.",
    en: "Nexora — your premium personal hub.",
  },
  description: {
    fr: "Gérez votre compte, votre abonnement premium et votre support client.",
    en: "Manage your account, premium subscription and customer support.",
  },
};

/** Manifest PWA neutre servi quand le flag est actif. */
export const APP_STORE_MANIFEST_HREF = "/manifest.appstore.webmanifest";
