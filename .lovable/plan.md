Intégration du Google tag (gtag.js) pour GA4

Objectif
- Ajouter le code de suivi fourni (G-MFZ9FD4YMB) sur toutes les pages du site afin de mesurer le trafic et les conversions.
- Conserver la sécurité existante en mettant à jour la Content-Security-Policy.

Changements prévus
1. Route racine (`src/routes/__root.tsx`)
   - Ajouter deux scripts dans le bloc `scripts` de `head()` :
     - Un script `async` vers `https://www.googletagmanager.com/gtag/js?id=G-MFZ9FD4YMB`.
     - Un script inline initialisant `window.dataLayer` et appelant `gtag('js', new Date())` + `gtag('config', 'G-MFZ9FD4YMB')`.
   - Les scripts seront positionnés avant/après le bloc JSON-LD existant, de manière à rester dans le `<head>`.

2. Sécurité (`src/start.ts`)
   - Mettre à jour `buildCsp()` pour inclure `https://www.googletagmanager.com` dans `script-src`.
   - Ajouter `https://www.google-analytics.com https://www.googletagmanager.com` dans `connect-src` (pour les hits collectés par `gtag` / `analytics.js` et `gtm.js`).
   - Ajouter `https://www.googletagmanager.com` dans `img-src` si le site utilise des pixels de mesure.
   - Conserver le mode `Content-Security-Policy-Report-Only` par défaut (actuellement géré via `CSP_ENFORCE`).

3. Vérifications
   - S’assurer que le build TypeScript passe (`bun run build` ou équivalent) et que les scripts apparaissent dans le `<head>` de la page d’accueil.
   - Vérifier que le header `Content-Security-Policy-Report-Only` n’émet pas de violations bloquantes pour Google Tag Manager en naviguant sur `/`.

Non inclus dans ce plan
- Aucun suivi d’événements personnalisés (achat, conversion, etc.) — seule la mesure de pagevue de base est ajoutée.
- Aucune modification de l’UI ou des pages existantes.

Risques / remarques
- La CSP actuelle est en `Report-Only`. Même si le domaine de Google Tag Manager n’est pas encore présent, le site ne bloque pas encore les violations. L’ajout de la CSP est donc préventif pour le futur passage en mode enforce.
- Le script `gtag` envoie des données vers Google. Les pages sont en HTTPS et les headers de sécurité restent conservateurs.