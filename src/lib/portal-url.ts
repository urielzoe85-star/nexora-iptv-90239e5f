// Sous-domaine dédié à l'espace client.
// Lovable attache un domaine perso au projet entier : account.nexora-iptv.com
// et www.nexora-iptv.com servent la même appli. Le middleware dans src/start.ts
// utilise ces constantes pour :
//   - rediriger la racine de account.* vers /espace-client
//   - renvoyer les routes marketing vers www.nexora-iptv.com
//   - laisser passer les routes du portail, l'auth, le checkout et les APIs

export const PORTAL_HOST = "account.nexora-iptv.com";
export const PORTAL_BASE_URL = `https://${PORTAL_HOST}`;
export const MARKETING_BASE_URL = "https://www.nexora-iptv.com";

// Préfixes autorisés sur account.* — tout le reste bascule sur www.
export const ACCOUNT_ALLOWED_PREFIXES = [
  "/espace-client",
  "/auth",
  "/checkout",
  "/api",
  "/lovable",
  "/assets",
  "/favicon",
  "/manifest",
  "/robots.txt",
  "/sitemap.xml",
  "/pwa-",
  "/apple-touch-icon",
];

export function isAccountAllowedPath(pathname: string): boolean {
  if (pathname === "/espace-client") return true;
  return ACCOUNT_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p),
  );
}