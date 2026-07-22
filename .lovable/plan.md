## Contexte

Un `curl -I https://app.nexora-iptv.com/` renvoie toujours **HTTP/2 302 → https://nexora-iptv.com/** (edge Cloudflare/Lovable, `server: cloudflare`, aucun `x-deployment-id`). Tant que le support Lovable n’a pas désactivé cette redirection, il est **impossible** d’obtenir un aperçu réel du sous-domaine via une URL publique : toute requête vers `app.nexora-iptv.com` est interceptée avant d’atteindre l’app, donc le `AppStoreGate` (qui s’active sur ce hostname) ne peut pas s’exécuter.

## Objectif

Te fournir un aperçu visuel fidèle du rendu que verra Apple, sans attendre la réponse du support, en simulant localement le hostname `app.nexora-iptv.com`.

## Plan

1. **Build neutralisé local**
   - Exécuter `VITE_APP_STORE_MODE=1 bun run build` (déjà scripté).
   - Lancer `bash scripts/check-appstore-build.sh` pour confirmer 0 occurrence sensible.

2. **Servir le build en local**
   - `bunx vite preview --port 4173` sur `dist/`.
   - Le flag `VITE_APP_STORE_MODE=1` étant compilé, le Gate s’active quel que soit le hostname.

3. **Captures Playwright multi-viewports**
   - Ouvrir `http://localhost:4173/` en desktop (1280×1800) et mobile (390×844).
   - Capturer :
     - Accueil `/`
     - `/blog`, `/espace-client`, `/downloads`
     - Une route bloquée (ex. `/produits`) pour vérifier la redirection vers `/`
     - `/robots.txt`, `/sitemap.xml`, `/rss.xml` (doivent renvoyer version vide/`Disallow: /`)
   - Screenshots sauvegardés dans `/tmp/browser/appstore-preview/`.

4. **Vérifications runtime dans les captures**
   - `<title>`, meta description, OG/Twitter sanitizés (aucun terme sensible).
   - `<meta name="robots" content="noindex,nofollow,noarchive">` présent.
   - `link[rel=manifest]` pointe vers `/manifest.appstore.webmanifest`.
   - Marquee paiements, bandeau reseller, boutons WhatsApp/Messenger flottants **masqués** (`data-app-store="hide"`).

5. **Rapport visuel**
   - Te renvoyer les screenshots clés + un résumé texte : « Aperçu conforme, 0 fuite détectée » ou liste des écarts à corriger.

6. **Optionnel — aperçu du redirect actuel**
   - Screenshot du comportement public réel (`https://app.nexora-iptv.com/` → 302 → homepage IPTV normale) pour documenter l’état pré-support à joindre au ticket Lovable si utile.

## Détails techniques

- Aucune modification de code — uniquement build + preview + Playwright.
- Aucun impact sur `nexora-iptv.com`, le NCC, la base ou les webhooks.
- Le build App Store écrase temporairement `dist/` ; on peut le régénérer ensuite en mode normal si besoin de repasser en prod locale.
