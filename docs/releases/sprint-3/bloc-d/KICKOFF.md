# Sprint 3 — Bloc D · Défense en profondeur

_Opened: 2026-07-03 · Target release: v1.0.0-ga_

## Portée (S3-P1-01, S3-P1-02, S3-P1-04)

Trois durcissements complémentaires posés en une itération, chacun réversible
par feature flag ou variable d'environnement.

## Livrables

### 1. CSP stricte (S3-P1-01)

- Politique complète construite dans `src/start.ts::buildCsp()` :
  `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`,
  whitelist explicite pour Google Fonts, l'image OG (`storage.googleapis.com`)
  et le projet Supabase (`VITE_SUPABASE_URL` + WebSocket équivalent).
- **Mode Report-Only par défaut** (`Content-Security-Policy-Report-Only`).
  Bascule en enforce via `CSP_ENFORCE=1` après 7 jours sans violation.
- Endpoint `/api/public/csp-report` (voir `src/routes/api/public/csp-report.ts`) :
  rate-limité (30 req/min/IP), filtre le bruit d'extensions navigateur,
  persiste chaque violation dans `security_events` (severity `warn`) → alerte
  Telegram automatique.
- En-têtes complémentaires : `Cross-Origin-Opener-Policy: same-origin`.
- Header CSP posé uniquement sur les réponses `text/html` pour éviter les
  faux positifs sur JSON / assets.

### 2. Subresource Integrity (S3-P1-02)

- Aucune balise `<script>` tiers n'est aujourd'hui embarquée. Google Fonts
  CSS ne peut pas être pinné par SRI (Google renvoie une CSS différente par
  User-Agent) — on documente cette exception et on protège cet asset via CSP
  (`style-src` / `font-src`) uniquement.
- Helper `src/lib/sri.ts` (`sriLink`, `sriScript`) : toute future dépendance
  tierce statique DOIT passer par ce helper. Le review PR échoue sinon.

### 3. Signature d'artefacts (S3-P1-04)

- Script `scripts/sign-artifacts.mjs` : produit `SHA256SUMS` + `manifest.json`
  sur le contenu de `dist/`. Si `ARTIFACT_SIGNING_KEY` (seed ed25519 32 B en
  hex ou base64) est présent, ajoute `SHA256SUMS.sig`.
- Workflow CI `.github/workflows/sprint-3-bloc-d.yml` : build + typecheck +
  signature à chaque modification des surfaces sensibles.
- Vérification côté vérifieur : `sha256sum -c SHA256SUMS` + validation de la
  signature avec la clé publique publiée (à ajouter dans
  `docs/releases/sprint-3/bloc-d/PUBLIC_KEY.txt` au premier build signé GA).

## Validation

- La preview et la prod servent `Content-Security-Policy-Report-Only` sur
  toutes les routes HTML.
- Aucune violation critique persistée en `security_events.event_type =
  'csp.violation'` sur 7 jours glissants avant bascule enforce.
- `bun run build && node scripts/sign-artifacts.mjs --dir dist --out /tmp/art`
  produit un `SHA256SUMS` non vide et un `manifest.json` valide.

## Rollback

- CSP : supprimer `CSP_ENFORCE=1` (ou revert du bloc `buildCsp` dans
  `src/start.ts`) — les autres headers restent en place.
- Signature : le script est additif, aucun rollback nécessaire.

## Bloc suivant

Bloc E — Résilience (chaos suite, rotation auto des secrets).
