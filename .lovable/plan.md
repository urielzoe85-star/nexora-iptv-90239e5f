# Rendre l'app 100% native dans Capacitor (masquer la PWA)

Objectif : quand l'app tourne dans le wrapper Capacitor (APK `com.nexora.app` pointant sur `https://app.nexora-iptv.com`), aucune logique PWA ne doit s'exécuter, et les ressources Android doivent utiliser les assets officiels Nexora.

## 1. Détection Capacitor côté web

Ajouter un helper unique `src/lib/runtime-env.ts` :

- `isCapacitorNative()` : renvoie `true` si
  - `window.Capacitor?.isNativePlatform?.() === true`, **ou**
  - `navigator.userAgent` contient `"NexoraApp"` (fallback si `@capacitor/core` n'est pas injecté côté web — le wrapper natif ajoute un UA custom).
- SSR-safe (`typeof window === "undefined"` → `false`).

Pas d'ajout de dépendance npm : on lit `window.Capacitor` de façon défensive, le SDK est fourni par le shell Android à l'exécution.

## 2. Neutraliser la PWA dans Capacitor

### `src/pwa/register.ts`
Ajouter `isCapacitorNative()` à la liste des contextes refusés dans `isRefusedContext()`. Le worker `/sw.js` existant est aussi désinscrit via `unregisterExisting()` (déjà en place), ce qui nettoie une éventuelle installation antérieure côté WebView.

### `src/components/pwa/PwaManager.tsx`
- Early-return `null` si `isCapacitorNative()`.
- Ne pas attacher `beforeinstallprompt` / `appinstalled`.
- Ne pas appeler `registerPwa`.

### `src/routes/__root.tsx`
- Ne pas monter `<PwaManager />` en natif (rendu conditionnel via un petit wrapper client qui lit `isCapacitorNative()` après hydratation pour éviter tout mismatch SSR).

### Manifest
- Laisser `public/manifest.webmanifest` inchangé (il reste utile pour la version web) mais Capacitor ne le consommera pas.

### Recherche complémentaire
Grep pour tout autre point d'installation PWA (`beforeinstallprompt`, `prompt()`, `installEvt`, boutons "Installer") et les masquer via la même garde. À ce jour seul `PwaManager.tsx` est concerné, mais la vérification est faite avant l'implémentation.

## 3. Navigation interne dans la WebView

Auditer les liens/handlers qui pourraient sortir vers un navigateur externe :

- Confirmer que toute la navigation applicative utilise `<Link>` de `@tanstack/react-router` (interne) — pas de changement.
- Pour les `<a href="…">` internes existants (mêmes hôtes : `nexora-iptv.com`, `app.nexora-iptv.com`, `www.nexora-iptv.com`, `account.nexora-iptv.com`), aucun ne doit avoir `target="_blank"`. Je vérifie et normalise dans les composants principaux (header, footer, CTA blog, portail).
- Les liens externes légitimes (réseaux sociaux, `m.me/...`, `wa.me/...`, téléchargements APK R2) gardent `target="_blank" rel="noopener noreferrer"` — le plugin `@capacitor/browser` côté APK peut les ouvrir dans un Custom Tab (à configurer côté wrapper, hors périmètre web).

Aucun changement de logique métier — uniquement du markup si un lien interne échappe accidentellement à la WebView.

## 4. Assets Android officiels Nexora

Le repo web ne contient pas le projet Android Capacitor ; je livre donc :

1. Les fichiers source haute résolution à placer dans `android/` du wrapper :
   - `icon-foreground.png` (432×432, logo Nexora, transparent) → couche adaptative `foreground`.
   - `icon-background.png` (432×432, aplat marine `#0F172A`) → couche adaptative `background`.
   - `icon.png` (1024×1024) → icône legacy.
   - `splash.png` (2732×2732, logo centré sur `#0F172A`) → splash universel.
2. Ces sources sont générées à partir du logo officiel déjà présent dans `src/assets/nexora-mark.jpg.asset.json` (redimensionnement + versions transparentes PNG) et déposées dans `public/brand/android/` du repo web pour référence/versioning.

### Procédure de régénération (à exécuter dans le repo Android Capacitor)

```text
# depuis la racine du projet wrapper (android/)
1. Copier les 4 sources dans android/app/src/main/assets/brand/
2. bunx @capacitor/assets generate \
     --iconBackgroundColor "#0F172A" \
     --iconBackgroundColorDark "#0F172A" \
     --splashBackgroundColor "#0F172A" \
     --splashBackgroundColorDark "#0F172A" \
     --assetPath android/app/src/main/assets/brand
3. Vérifier android/app/src/main/res/mipmap-*/ic_launcher*.png
   et android/app/src/main/res/drawable*/splash.png
4. npx cap sync android
5. ./gradlew assembleRelease
```

## 5. Fichiers modifiés (web)

- `src/lib/runtime-env.ts` — nouveau (détection Capacitor).
- `src/pwa/register.ts` — ajoute Capacitor aux contextes refusés.
- `src/components/pwa/PwaManager.tsx` — early-return en natif.
- `src/routes/__root.tsx` — montage conditionnel de `<PwaManager />`.
- `public/brand/android/{icon-foreground,icon-background,icon,splash}.png` — sources officielles (nouveaux).
- Éventuels ajustements ponctuels de `target="_blank"` sur liens internes détectés à l'audit (aucun connu pour l'instant).

## 6. Vérification

- `bun run build` doit rester vert.
- Ouverture web (`https://app.nexora-iptv.com` dans un navigateur) : bannière d'installation et enregistrement SW toujours fonctionnels.
- Ouverture APK : aucun `beforeinstallprompt`, aucune bannière, aucun SW enregistré (`navigator.serviceWorker.getRegistrations()` renvoie `[]` après premier boot).

## Notes techniques

- La détection UA `NexoraApp` suppose que le wrapper définit un `userAgent` custom dans `capacitor.config.ts` (`android.appendUserAgent: "NexoraApp"`). Si ce n'est pas déjà le cas, ajouter cette ligne côté wrapper — sinon la détection retombe sur `window.Capacitor` uniquement, ce qui suffit dès que `@capacitor/core` est bundlé dans l'APK.
- Aucune modification des workflows d'authentification, du portail client, du blog ou de la logique paiement.
