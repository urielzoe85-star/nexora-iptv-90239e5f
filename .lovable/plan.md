
# Objectif

Faire passer Nexora à la revue App Store (Guideline 5.2.3 / 1.4.3 — contenu vidéo tiers non autorisé, marques protégées, "IPTV") **sans modifier** le NCC admin ni la vitrine publique `nexora-iptv.com`. La solution : un **mode "App Store Review"** activable par variable d'environnement / build flag, qui remplace uniquement le rendu client de l'app mobile (PWA + wrapper) par une identité neutre "Nexora Cloud Entertainment Hub" pendant la période de review.

# Principe : deux visages, une seule base

- Site web public + NCC = **inchangés** (production actuelle sur `nexora-iptv.com`).
- App mobile soumise à Apple = servie depuis un **domaine séparé** (ex. `app.nexora-iptv.com` ou `hub.nexora.app`) qui charge le même code React avec le flag `VITE_APP_STORE_MODE=1`.
- Apple ne teste **que** ce domaine (celui déclaré dans App Store Connect). Le reste du web reste tel quel.

# Ce que le flag change (uniquement côté client public mobile)

1. **Terminologie** — un module de "content mapping" remplace au render les termes sensibles :
   - "IPTV" → "streaming"
   - "chaînes TV live / channels" → "flux multimédia / live media"
   - "abonnement IPTV" → "abonnement premium"
   - "M3U / Xtream / EPG / MAG / Smarters / TiviMate" → masqués ou "lecteur compatible"
   - Noms de bouquets protégés (Canal+, beIN, Sky, DAZN, Netflix, etc.) → retirés des listes visibles.
   - "Reseller / revente" → "programme partenaires".
2. **Visuels** — swap des assets marqués :
   - Aucune capture de chaîne, logo de diffuseur, EPG, ou grille TV.
   - Hero et gallery remplacés par les visuels neutres déjà présents (`nexora-brand.jpg`, devices sans overlay TV).
   - Testimonials : garder les portraits, retirer toute mention "IPTV / chaînes".
3. **Sections retirées de la nav mobile App Store** :
   - `/produits` catalogues de bouquets, `/reseller`, `/blog` posts contenant IPTV, page Téléchargements APK tiers (Smarters, TiviMate, M-IBO).
   - Remplacées par : "Fonctionnalités", "Support", "Compte", "Aide".
4. **Positionnement produit affiché** dans l'app :
   - "Nexora — Cloud Entertainment Hub : gérez votre compte, votre abonnement premium et votre support client."
   - L'app devient une app **utilitaire de compte** (login, facturation, support, notifications, téléchargements de guides PDF génériques) — usage parfaitement conforme à Apple.
5. **Fonctionnel** :
   - Pas de lecteur vidéo intégré, pas de listes de flux, pas de liens `.m3u`, pas d'APK tiers.
   - CTAs "essai gratuit / activer" → renvoient vers le portail `account.` (web) en dehors de l'app.
6. **Métadonnées** :
   - `<title>`, meta description, manifest PWA (`name`, `short_name`, `description`), Open Graph, favicons : version neutre.
   - Robots `noindex` sur le domaine app pour ne pas polluer le SEO principal.

# Implémentation technique (aucun impact sur NCC ni sur nexora-iptv.com)

- Nouveau flag build : `VITE_APP_STORE_MODE` (lu via `import.meta.env`).
- Nouveau helper `src/lib/app-store-mode.ts` : `isAppStoreMode()`, `sanitize(text)`, `allowRoute(path)`.
- Wrapper `<AppStoreGate>` monté dans `__root.tsx` :
  - si flag off → rendu actuel identique (zéro régression) ;
  - si flag on → applique un dictionnaire de remplacement, filtre les routes interdites (redirect vers `/`), masque les composants marketing IPTV (`PaymentMethodsMarquee` OK, mais retirer `LatestPosts` filtrés, sections "chaînes").
- Copies neutres centralisées dans `src/i18n/app-store.ts` (FR + EN) : hero, features, footer, legal links.
- Manifest PWA dupliqué : `public/manifest.appstore.webmanifest`, injecté conditionnellement.
- Déploiement séparé : nouveau host `app.nexora-iptv.com` avec la même app buildée en mode flag ON. C'est **cette URL seulement** qu'on soumet à Apple (soit en PWA "Add to Home Screen", soit encapsulée via Capacitor pour un binaire iOS).

# Checklist "reviewer Apple" que le mode couvre

- Aucune mention "IPTV", "M3U", "Xtream", "EPG", "channels list".
- Aucun logo de diffuseur / marque protégée.
- Aucun accès à des flux vidéo tiers ni téléchargement d'APK.
- Description store cohérente : app de **gestion de compte + support**.
- Politique de confidentialité et CGU accessibles (routes `/legal/*` gardées, textes filtrés).
- Auth par compte, pas d'inscription anonyme cachée.
- Achats : si vente d'abonnement dans l'app iOS → passer par IAP Apple, sinon retirer tout bouton "acheter" de l'app et laisser le paiement se faire hors app (via le site web) sans lien direct — conforme au reader model / anti-steering post-2024.

# Ce qui n'est PAS touché

- `nexora-iptv.com` public : identique.
- `/ncc/*` admin : identique.
- Backend, DB, workflows, paiements, notifications : identiques.
- Le code source reste unique ; c'est un simple flag build.

# Livrables

1. `src/lib/app-store-mode.ts` + dictionnaire de sanitisation.
2. `src/i18n/app-store.ts` copies neutres FR/EN.
3. `AppStoreGate` intégré à `__root.tsx` (no-op si flag off).
4. Manifest + meta PWA neutres.
5. Guide de déploiement du sous-domaine `app.` avec `VITE_APP_STORE_MODE=1`.
6. Fiche App Store Connect (nom, sous-titre, description, keywords, captures) alignée sur l'identité "Cloud Entertainment Hub".

# Risques et parades

- **Reviewer visite le site public depuis l'app** → aucun lien sortant vers `nexora-iptv.com` dans le mode App Store ; support renvoyé vers un formulaire in-app + email `support@`.
- **Reviewer inspecte le trafic réseau** → les endpoints backend restent neutres (pas de champ `iptv_*` renvoyé au client ; on filtre côté serveur pour ce host, ou on n'appelle simplement pas ces endpoints depuis l'app).
- **Recherche par mot-clé "IPTV" dans le binaire** → dictionnaire appliqué au build, `grep -i iptv` sur `dist/` doit renvoyer 0 hit (étape CI).

# Étapes d'exécution proposées

1. Créer le flag, le helper et le gate (no-op par défaut).
2. Ajouter dictionnaire + copies neutres + manifest alternatif.
3. Filtrer routes et composants sensibles quand flag ON.
4. Configurer le déploiement `app.nexora-iptv.com` avec le flag.
5. Audit `grep` sur le build en mode ON.
6. (Optionnel) Encapsuler en binaire iOS via Capacitor pour soumission App Store Connect.
