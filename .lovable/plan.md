## Objectif

Neutraliser complètement la couche PWA (service worker, enregistrement, manifest) pour tous les contextes — web et Capacitor — afin de vérifier si la WebView Android fonctionne normalement sans elle. Aucune fonctionnalité métier n'est touchée, le site reste responsive et identique visuellement.

Tout est fait de façon réversible : un seul interrupteur central `PWA_ENABLED = false` permet de tout réactiver plus tard.

## Modifications prévues

**1. `src/pwa/config.ts` (nouveau)**
Un unique drapeau `export const PWA_ENABLED = false;` avec un commentaire expliquant que c'est un test temporaire Capacitor.

**2. `vite.config.ts`**
Retirer le plugin `VitePWA` du tableau de plugins (mis en commentaire avec la config intacte, pour réactivation immédiate). Résultat : plus aucun `sw.js` généré ni précache Workbox dans le build.

**3. `src/pwa/register.ts`**
`registerPwa()` devient un no-op quand `PWA_ENABLED` est faux : il n'enregistre rien et se contente de **désenregistrer** tout service worker `/sw.js` déjà installé et de purger les caches Workbox — indispensable pour les appareils qui ont déjà un SW actif (sinon l'ancien SW continue à servir du HTML en cache, ce qui peut expliquer la page blanche).

**4. `src/components/pwa/PwaManager.tsx`**
Retourne `null` immédiatement quand la PWA est désactivée, après avoir déclenché le nettoyage du SW. Plus aucune bannière « Installer Nexora », plus aucun écouteur `beforeinstallprompt`, plus de bannière de mise à jour.

**5. `src/routes/__root.tsx`**
- Supprimer la ligne `{ rel: "manifest", href: "/manifest.webmanifest" }` des `links`.
- Supprimer les meta `apple-mobile-web-app-capable` / `mobile-web-app-capable` (elles participent à l'heuristique d'installabilité).
- Simplifier le script inline natif : la partie « strip manifest » et `MutationObserver` n'a plus lieu d'être puisqu'aucun manifest n'est chargé ; on conserve uniquement la détection `window.__NEXORA_NATIVE__` et le blocage défensif de `serviceWorker.register`.
- Conserver `theme-color`, `apple-touch-icon` et les favicons (purement cosmétiques, sans effet sur l'installabilité).

**6. `public/manifest.webmanifest`**
Le fichier est **conservé tel quel** sur le disque, simplement plus référencé. Rien à réécrire à la réactivation.

## Ce qui n'est pas touché

Routes, checkout, NCC, blog, IA, paiements, notifications, i18n, styles, SEO (title/description/JSON-LD/sitemap/hreflang restent intacts).

## Après application

Vous devrez reconstruire l'APK (`npx cap sync android` puis rebuild) pour embarquer le bundle sans PWA. Sur un appareil ayant déjà lancé l'ancienne version, il est recommandé de vider les données de l'app une fois, car un service worker précédemment installé survit à la mise à jour du bundle.

Je vous listerai les fichiers modifiés exactement à la fin de l'implémentation.
