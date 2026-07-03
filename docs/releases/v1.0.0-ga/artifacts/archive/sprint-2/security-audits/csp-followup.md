# CSP — Follow-up ticket (Sprint 2 / Bloc B)

**Statut** : Reporté volontairement. Non bloquant pour la clôture du Bloc B.
**Owner** : équipe sécurité NEXORA.
**Cible** : Sprint 2.x ou début Sprint 3, avant audit externe.

## Contexte

Le middleware `securityHeadersMiddleware` (`src/start.ts`) applique désormais
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy` et `Strict-Transport-Security` sur toutes les réponses SSR,
server-routes et server-functions. La `Content-Security-Policy` a été
**intentionnellement omise** dans cette itération.

## Raison du report

Une CSP restrictive posée sans audit préalable casserait :

- les scripts inline injectés par TanStack Start (hydration, HeadContent JSON-LD),
- les fonts Google (`fonts.googleapis.com` / `fonts.gstatic.com`) chargées via
  `<link>` dans `__root.tsx`,
- l'image OG hébergée sur `storage.googleapis.com`,
- les futurs iframes de paiement / trackers analytics (à décider).

Une CSP `default-src 'self'` sans whitelist explicite provoquerait un site
cassé en production.

## Périmètre du ticket

1. **Audit statique** — inventorier toutes les sources tierces réellement
   utilisées (fonts, images, scripts, connect, media, frame).
2. **Audit dynamique** — activer `Content-Security-Policy-Report-Only` avec
   un endpoint `/api/public/csp-report` (rate-limité, stocké dans
   `security_events`) pendant ≥ 7 jours en preview + prod.
3. **Rédaction de la politique** — cible minimale :
   - `default-src 'self'`
   - `script-src 'self' 'strict-dynamic' <nonce>` (nonce généré par SSR)
   - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` (à
     réévaluer selon les styles inline injectés par Tailwind/HeadContent)
   - `font-src 'self' https://fonts.gstatic.com`
   - `img-src 'self' data: https://storage.googleapis.com`
   - `connect-src 'self' https://<supabase-ref>.supabase.co wss://<supabase-ref>.supabase.co`
   - `frame-ancestors 'none'` (redondant avec X-Frame-Options mais standard).
4. **Rollout** — Report-Only → Enforce, avec fallback rapide (feature flag env).
5. **Tests** — étendre `tests/rc2/security_headers_test.py` pour exiger
   `Content-Security-Policy` une fois la politique enforce.

## Definition of Done

- CSP enforce sur `nexora-iptv.com` et `www.nexora-iptv.com`.
- 0 violation `blocked-uri` critique sur 7 jours glissants en prod.
- Note ≥ A+ sur securityheaders.com.
- Ce document mis à jour et clôturé, ou archivé sous
  `docs/releases/v1.0.0-rc2/`.

## Références

- MDN — [Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- OWASP — [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- Sprint 2 plan : `docs/sprints/sprint-2-plan.md` (Bloc B, tâche B4).