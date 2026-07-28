# Plan : vérifier que `isNativePlatform()` retourne bien true dans le wrapper Capacitor

## Contexte
La détection native est déjà implémentée dans `src/lib/runtime-env.ts` avec deux mécanismes :
1. `window.Capacitor?.isNativePlatform?.()` — retourne `true` si le bridge Capacitor est injecté.
2. Fallback sur `navigator.userAgent` contenant `NexoraApp` (ajouté par `capacitor.config.ts` avec `appendUserAgent: " NexoraApp"`).

## Objectif
Ajouter un log temporaire pour confirmer que la détection est effective dans le contexte réel du wrapper Android/iOS.

## Étapes

### 1. Ajouter un log temporaire dans `src/lib/runtime-env.ts`
Loguer dans la console les valeurs observées au moment de l'appel :
- `window.Capacitor?.isNativePlatform?.()`
- `navigator.userAgent`
- Résultat final de `isCapacitorNative()`

Utiliser un `console.info` clairement préfixé pour pouvoir le retrouver dans les logs.

### 2. Vérification build
Lancer `bun run build` pour s'assurer que l'ajout du log ne casse rien.

### 3. Test dans le navigateur avec simulation Capacitor
Depuis l'aperçu Lovable, simuler un environnement Capacitor en modifiant temporairement le user-agent ou en injectant `window.Capacitor` via la console, et vérifier que le log affiche `true`.

### 4. Test réel sur tablette (à faire de ton côté)
Je ne peux pas accéder à ta tablette directement. La procédure sera :
- Déployer la version avec le log sur `https://app.nexora-iptv.com`.
- Ouvrir l'APK Capacitor sur la tablette.
- Ouvrir les outils de développement Chrome/Safari connectés à la WebView.
- Rechercher le log préfixé dans la console et noter la valeur affichée.

### 5. Suppression du log après confirmation
Une fois le résultat confirmé, retirer le log temporaire pour ne pas polluer la console en production.

## Fichiers modifiés
- `src/lib/runtime-env.ts` (ajout d'un log temporaire, puis retrait après validation).

## Livrables
- Build vert.
- Log observable dans la console de la WebView.
- Rapport du résultat observé dans l'APK réel.