# Audit final App Store — app.nexora-iptv.com

Objectif : produire un rapport prouvant qu'aucun terme sensible (IPTV, M3U, Xtream, EPG, VOD, reseller, bouquet, chaînes TV, décodeur, Smarters, TiviMate, marques protégées…) n'est servi sous `app.nexora-iptv.com`, et que le Gate neutralise correctement le rendu.

## 1. Build App Store neutralisé

```bash
VITE_APP_STORE_MODE=1 bun run build
bash scripts/check-appstore-build.sh dist
```

Le script existant refuse déjà le build si un terme prohibé subsiste dans `dist/`. On l'utilise comme première barrière.

## 2. Audit statique du bundle `dist/`

Un script Node `scripts/audit-appstore.mjs` (créé pour l'audit) va scanner `dist/` selon la checklist :

| # | Cible | Vérification |
|---|---|---|
| 1 | Textes visibles | grep sur `.html` + tous chunks `.js` avec le dictionnaire étendu |
| 2 | Menus / labels | scan des chaînes contenant `nav`, `menu`, aria-label, alt |
| 3 | Images | inventaire des `.png/.jpg/.svg/.webp` référencés + OCR-free : vérification des noms de fichiers (aucun `iptv`, `m3u`, `smarters`, `channel`…) |
| 4 | JSON | scan récursif `.json`, `.webmanifest` (dont `manifest.appstore.webmanifest`) |
| 5 | Données envoyées au navigateur | HTML initial + chunks + inline JSON (`__TSR__`, `dehydrated`) |
| 6 | Erreurs JS | run Playwright headless sur `http://localhost:8080` avec header `Host: app.nexora-iptv.com` : capture `console.error` / `pageerror` |
| 7 | Réponses API servies au sous-domaine | fetch `/sitemap.xml`, `/rss.xml`, `/robots.txt`, `/manifest.webmanifest` avec `Host: app.nexora-iptv.com` → doivent être vides / neutres |
| 8 | Fichiers statiques | check `public/manifest.appstore.webmanifest`, robots route dynamique, sitemap/rss vides sur ce host |
| 9 | Vérif zéro-occurrence | consolidation : liste des matches (fichier, ligne, terme) — doit être vide |

Dictionnaire de scan (superset de `SANITIZE_DICT`) :
`iptv, m3u, m3u8, xtream, epg, vod, replay, bouquet, revendeur, reseller, décodeur, chaîne(s) tv, live tv, smart iptv, smarters, tivimate, m-ibo, gse, mag box, canal+, bein, sky sports, dazn, netflix, disney, prime video, hbo`.

## 3. Audit runtime (Playwright)

Script `tests/appstore/audit-runtime.mjs` :

- lance Chromium, injecte `Host: app.nexora-iptv.com` via `route()` sur localhost
- visite `/`, `/fr`, `/en`, `/de`, `/blog`, `/catalog`, `/galerie`, `/produits` (doit rediriger `/`), `/reseller` (idem), `/legal/*`
- pour chaque page :
  - dump `document.title`, `meta[name=description]`, `meta[property^=og:]`, `meta[name=robots]`
  - dump `document.body.innerText`
  - liste `img[src]` + `img[alt]`
  - liste `a[href]` et `button` (menus)
  - collecte `console.error` / `pageerror`
  - fetch `/sitemap.xml`, `/rss.xml`, `/robots.txt`
- passe chaque chaîne collectée dans le regex-dictionnaire

## 4. Rapport final

Fichier généré : `docs/releases/appstore/audit-YYYYMMDD.md` avec :

- date, commit hash, hostname simulé
- résumé : PASS / FAIL par catégorie de la checklist
- tableau des fichiers scannés (nb + taille)
- tableau des pages parcourues (URL, status, console errors)
- section **"Occurrences de termes sensibles"** — attendu : `Aucune occurrence détectée.`
- annexes : sortie brute `check-appstore-build.sh`, dump meta/manifest/robots/sitemap servis au sous-domaine
- checklist Apple cochée (9 points ci-dessus)

Si le rapport détecte quoi que ce soit → on étend `SANITIZE_DICT` ou on marque `data-app-store="hide"` sur l'élément fautif, on relance, jusqu'à zéro occurrence.

## 5. Livrables

- `scripts/audit-appstore.mjs` (scan statique)
- `tests/appstore/audit-runtime.mjs` (scan runtime Playwright)
- `docs/releases/appstore/audit-YYYYMMDD.md` (rapport signé)
- Aucune modification du site public, du NCC, du schéma DB, des edge functions.

Après validation du rapport → tu peux enchaîner `bunx cap sync ios && bunx cap open ios` sur ton Mac en toute sécurité.
