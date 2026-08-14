# Mode debug du service worker

Objectif : pouvoir observer, depuis un navigateur, ce que fait réellement le service worker Nexora — état des caches, cycle de mise à jour, erreurs de navigation — sans changer le comportement de la PWA pour les visiteurs normaux.

## Activation

Le debug reste **désactivé par défaut**. Trois façons de l'activer :

- `?sw=debug` dans l'URL (persiste dans `localStorage`)
- `localStorage.setItem("nexora.pwa.debug", "1")`
- `?sw=debug=off` pour couper

Aucun effet en natif Capacitor ni quand la PWA est refusée (dev, iframe, aperçu, `?sw=off`) : ces gardes existantes restent prioritaires.

## Ce qui sera journalisé

Journal préfixé `[pwa]` dans la console, avec horodatage :

- Enregistrement : succès/échec, scope, URL du script, version du SW actif
- Cycle de vie : `installing`, `installed`, `waiting`, `activated`, `controlling`, `redundant`
- Mises à jour : détection d'une nouvelle version, acceptation/refus par l'utilisateur, `skipWaiting`, rechargement
- Caches : noms des caches présents, nombre d'entrées par cache, taille estimée via `navigator.storage.estimate()`, caches purgés lors du nettoyage
- Navigation : échecs de navigation servis par le fallback réseau/cache, erreurs `fetch` du SW, passages hors ligne/en ligne

## Panneau de diagnostic

Quand le debug est actif, un petit panneau flottant discret (repliable, coin bas-gauche) affiche l'essentiel : version du SW, état, nombre de caches et d'entrées, dernière erreur. Il propose trois actions : rafraîchir l'état, vider tous les caches Nexora, désenregistrer le SW. Invisible pour les visiteurs normaux.

## Détails techniques

- Nouveau `src/pwa/debug.ts` : détection du flag, `pwaLog()` / `pwaWarn()` no-op quand inactif, inspection des caches et de l'estimation de stockage, exposition d'un helper `window.__nexoraPwa` (état, `clearCaches()`, `unregister()`) uniquement en mode debug.
- `src/pwa/register.ts` : instrumentation de `registerPwa` (Workbox events `installed`, `waiting`, `controlling`, `activated`, `redundant`, `message`), log des purges dans `unregisterExisting`, log de la raison exacte du refus de contexte.
- `vite.config.ts` : ajout de `workbox.mode` explicite en production (`production`, donc pas de logs Workbox internes en prod pour les visiteurs) — les logs viennent de notre couche `debug.ts`, pas d'un SW verbeux, pour ne pas alourdir le bundle.
- `src/components/pwa/PwaManager.tsx` : montage conditionnel du nouveau `PwaDebugPanel` (`src/components/pwa/PwaDebugPanel.tsx`), plus logs sur accept/refus de mise à jour et sur `beforeinstallprompt`/`appinstalled`.
- Écouteurs `online`/`offline` et `navigator.serviceWorker.onerror` pour tracer les erreurs de navigation côté client.
- Aucune modification du comportement de cache, du manifest, ni des gardes natives.

## Vérification

Typecheck + build, contrôle que `dist/client/sw.js` est toujours généré, et test du panneau sur le site publié avec `?sw=debug` (le service worker ne s'enregistre pas dans l'aperçu de l'éditeur, par conception).
