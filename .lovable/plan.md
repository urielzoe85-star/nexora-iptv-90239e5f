# Utiliser account.nexora-iptv.com comme domaine dédié à l'espace client

## Contexte

Chez Lovable, un domaine personnalisé s'attache au **projet entier**, pas à un sous-chemin. `account.nexora-iptv.com` servira donc la même appli que `www.nexora-iptv.com`. Pour qu'il se comporte comme un "portail client dédié", on ajoute un routage conscient du hostname : sur `account.*`, la racine et les pages marketing basculent vers `/espace-client`.

## Étape 1 — Connecter le sous-domaine (côté utilisateur)

Dans Project Settings → Domains → Connect Domain :
- saisir `account.nexora-iptv.com`
- ajouter chez le registrar les enregistrements affichés (A vers `185.158.133.1` + TXT `_lovable`, ou CNAME si mode proxy Cloudflare)
- attendre la vérif + provisioning SSL

Aucune action code tant que ce n'est pas fait, mais le code ci-dessous peut être livré en parallèle : il reste inactif tant que le domaine ne résout pas.

## Étape 2 — Routage host-aware

**`src/start.ts`** — dans le middleware de requêtes, avant les autres redirections, intercepter les requêtes GET HTML dont `Host === "account.nexora-iptv.com"` :

- `/` → 302 `/espace-client`
- toutes les routes publiques marketing (`/`, `/tarifs`, `/guide-iptv`, `/contact`, `/a-propos`, `/blog*`, `/fr/*` marketing, etc.) → 302 vers la même page sur `https://www.nexora-iptv.com<path>`
- laisser passer sans rediriger : `/espace-client*`, `/auth*`, `/checkout*` (nécessaire au renouvellement), `/api/*`, `/lovable/*`, assets statiques, `/robots.txt`, `/sitemap.xml`

Un petit tableau `ACCOUNT_ALLOWED_PREFIXES` centralise la liste ; tout le reste bascule sur www. Bypass total pour `/lovable/*` et `/api/*` (déjà en place — ne pas casser).

## Étape 3 — SEO propre pour account.*

**`src/routes/__root.tsx`** — ajouter un `<meta name="robots" content="noindex, nofollow">` conditionnel côté SSR uniquement quand le host est `account.nexora-iptv.com`, pour éviter que Google indexe un doublon du site marketing en cas de fuite. Les canonicals des pages `espace-client.*` restent en relatif (déjà fait dans la dernière passe SEO) → ils pointeront naturellement vers `account.nexora-iptv.com/espace-client/...`.

**`public/robots.txt`** — reste tel quel (partagé). La balise noindex host-aware suffit.

## Étape 4 — Auth & liens sortants

- **`src/integrations/supabase/client.ts`** est auto-généré, ne pas y toucher. Les redirects OAuth utilisent `window.location.origin`, donc ils fonctionneront automatiquement depuis `account.nexora-iptv.com`.
- Vérifier qu'aucune URL absolue vers `www.nexora-iptv.com/espace-client` n'est codée en dur dans les emails / notifications. Si oui, remplacer par `https://account.nexora-iptv.com/...` dans :
  - templates email (`src/lib/email-templates/*.tsx`) — liens "Accéder à mon espace"
  - messages WhatsApp/Telegram de livraison IPTV (`src/lib/iptv-dispatch.server.ts`, `src/lib/delivery.functions.ts`)
  - bulk templates (`src/domain/delivery/builtin-templates.ts`)

Centraliser via une constante `PORTAL_BASE_URL = "https://account.nexora-iptv.com"` (nouveau fichier `src/lib/portal-url.ts`) réutilisée partout.

## Étape 5 — Redirection douce depuis www

Optionnel mais recommandé : sur `www.nexora-iptv.com/espace-client*`, ajouter un `<link rel="canonical" href="https://account.nexora-iptv.com/espace-client/...">` (pas de redirect dur pour ne pas casser les sessions existantes). Documenter dans un futur pass qu'on pourra activer une vraie 301 quand tous les liens externes seront migrés.

## Détails techniques

```ts
// src/lib/portal-url.ts
export const PORTAL_HOST = "account.nexora-iptv.com";
export const PORTAL_BASE_URL = `https://${PORTAL_HOST}`;
export const MARKETING_BASE_URL = "https://www.nexora-iptv.com";

export const ACCOUNT_ALLOWED_PREFIXES = [
  "/espace-client", "/auth", "/checkout",
  "/api", "/lovable", "/assets", "/favicon", "/manifest",
  "/robots.txt", "/sitemap.xml",
];
```

```ts
// src/start.ts (extrait, dans le middleware existant)
const url = new URL(request.url);
if (url.hostname === PORTAL_HOST && request.method === "GET") {
  const p = url.pathname;
  if (p === "/" || p === "") return Response.redirect(`${PORTAL_BASE_URL}/espace-client`, 302);
  const allowed = ACCOUNT_ALLOWED_PREFIXES.some(pref => p === pref || p.startsWith(pref + "/") || p.startsWith(pref));
  if (!allowed) return Response.redirect(`${MARKETING_BASE_URL}${p}${url.search}`, 302);
}
```

## Résultat attendu

- `account.nexora-iptv.com` → `/espace-client` (login puis dashboard client)
- `account.nexora-iptv.com/tarifs` → redirigé vers `www.nexora-iptv.com/tarifs`
- Emails et messages de livraison pointent vers `account.nexora-iptv.com`
- Aucun impact SEO (site marketing indexé sur www, portail noindex)
- Ne bloque pas la config email actuelle sur `send.nexora-iptv.com`
