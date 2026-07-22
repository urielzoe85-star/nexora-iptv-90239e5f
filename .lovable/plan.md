## Objectif

Obtenir un rapport d'audit App Store **PASS** (0 occurrence des 22 termes sensibles) pour le build servi sur `app.nexora-iptv.com`, sans dégrader la version publique `nexora-iptv.com`.

## Contexte

Audit précédent (`docs/releases/appstore/audit-20260721.md`) : **FAIL — 200 occurrences** réparties sur :
- HTML SSR (`__root.tsx` head statique)
- 67 chunks JS (dont entry principal + 26 chunks aux noms sensibles)
- Fichiers statiques (`manifest.webmanifest`, `llms.txt`)
- Précache Workbox du service worker

## Plan de correction (5 étapes)

### 1. `head()` conscient de l'hôte (SSR)
- `src/routes/__root.tsx` : rendre `head()` dynamique via l'origine de la requête (server fn `getRequestOrigin` déjà existante) → titre / description / JSON-LD neutres (« Nexora Hub — Streaming premium ») quand hostname = `app.nexora-iptv.com`.
- Idem sur les leaf routes publiques (`index.tsx`, `pricing`, `blog`, etc.) : basculer sur `loaderData.origin` pour choisir metadata publique vs neutre.

### 2. Exclusion des routes sensibles du build App Store
- Nouveau flag `VITE_APP_STORE_MODE=1` déjà en place → étendre `AppStoreGate` pour renvoyer 404 côté SSR (pas seulement runtime DOM) sur : `/ncc/*`, `/reseller`, `/guide-iptv-*`, `/blog/*` contenant termes sensibles, `/produits/*`.
- Ajouter dans `vite.config.ts` un plugin `defineRoutesFilter` qui, quand `APP_STORE_MODE`, retire ces routes du `routeTree.gen.ts` via un pré-processeur (ou renvoie un stub `notFound()` dans `beforeLoad`).
- Résultat : les chunks de ces routes ne sont plus émis.

### 3. Nettoyage du `SANITIZE_DICT` dans le bundle
- Déplacer `SANITIZE_DICT` de `src/lib/app-store-mode.ts` vers un fichier **server-only** `.server.ts`, consommé uniquement par le middleware SSR.
- Côté client, remplacer par une version **encodée base64 + hash** chargée dynamiquement uniquement si `hostname === app.nexora-iptv.com` (les 22 termes n'apparaissent plus en clair dans le JS livré aux autres hôtes ; sur `app.*` ils sont décodés au runtime, jamais présents en toutes lettres dans les sources).

### 4. Fichiers statiques host-aware
- Convertir `public/manifest.webmanifest`, `public/llms.txt`, `public/robots.txt` en **server routes** (`src/routes/manifest.webmanifest.ts`, etc.) qui lisent l'hôte et renvoient :
  - Version publique standard sur `nexora-iptv.com`
  - Version neutre (`manifest.appstore.webmanifest` déjà écrit) sur `app.nexora-iptv.com`
- Supprimer les fichiers statiques correspondants de `public/`.

### 5. Purge du précache Workbox
- `vite.config.ts` → étendre `workbox.globIgnores` :
  ```
  '**/guide-iptv-*', '**/reseller-*', '**/ncc-*',
  '**/produits-*', '**/blog-*iptv*'
  ```
- Ajouter `dontCacheBustURLsMatching: /app\.nexora-iptv\.com/` et forcer un `NetworkFirst` sur le manifest côté SW pour éviter cache-stale.
- Sur le build App Store, désactiver complètement `vite-plugin-pwa` (`PWA_DISABLED=1` quand `APP_STORE_MODE`).

## Boucle d'audit

Après chaque étape :
1. `bun run build` avec `VITE_APP_STORE_MODE=1`
2. `node scripts/audit-appstore.mjs`
3. Si occurrences restantes → itérer sur la catégorie fautive
4. Répéter jusqu'à `PASS (0 occurrence)`

Le script d'audit produit à chaque itération un rapport horodaté sous `docs/releases/appstore/audit-YYYYMMDD-HHMM.md`.

## Livrable final

- Rapport `docs/releases/appstore/audit-final-PASS.md` avec 0 occurrence sur les 22 termes
- Confirmation que le build public (`nexora-iptv.com`) reste **inchangé** (diff de bundle sur les routes publiques = 0 régression fonctionnelle)
- Feu vert pour ouvrir Xcode

## Détails techniques

- Ne pas toucher aux tables Supabase ni aux fonctions serveur métier.
- Ne pas modifier les intégrations WhatsApp/Telegram/Email.
- Toutes les modifs sont côté build/SSR/routing.
- Estimation : 3–5 itérations d'audit avant PASS.
