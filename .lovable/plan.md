# Plan : validation native Capacitor + PWA neutralisée

Objectif : s'assurer que l'app web se comporte à 100 % comme une app native quand elle tourne dans le wrapper Capacitor (`com.nexora.app` → `https://app.nexora-iptv.com`), sans casser la PWA du navigateur web.

## 1. Vérification du build

- Lancer `bun run build`.
- Vérifier qu'aucune erreur `__vite-browser-external` ou autre ne bloque la sortie.
- Vérifier que `src/components/pwa/PwaManager.tsx`, `src/pwa/register.ts` et `src/lib/runtime-env.ts` compilent.

## 2. Regénération des assets Android officiels

Les fichiers existants dans `public/brand/android/` ont les dimensions/sources suivantes :

| Fichier | Existant | Requis | Action |
|---|---|---|---|
| `icon.png` | 1024×1024 PNG | 1024×1024 PNG | Conserver/vérifier |
| `icon-foreground.png` | 1024×1024 PNG | 432×432 PNG transparent | Regénérer/redimensionner |
| `icon-background.png` | 1024×1024 JPEG | 432×432 PNG `#0F172A` | Regénérer en PNG |
| `splash.png` | 1920×1920 PNG | 2732×2732 PNG `#0F172A` | Regénérer/redimensionner |

Source : `src/assets/nexora-mark.jpg.asset.json` (logo officiel Nexora).

Actions :
- Télécharger le logo officiel via le CDN Lovable (`/__l5e/assets-v1/efff519c-edd2-485b-ae27-cb44351a7883/nexora-mark.jpg`).
- Générer `icon-foreground.png` 432×432 transparent à partir du logo.
- Générer `icon-background.png` 432×432 aplat `#0F172A`.
- Générer `icon.png` 1024×1024 (legacy).
- Générer `splash.png` 2732×2732 avec logo centré sur fond `#0F172A`.
- Externaliser les nouveaux fichiers en assets Lovable (`public/brand/android/*.png`) afin de ne pas alourdir le repo.

## 3. Audit des liens internes dans la WebView

Rechercher tous les liens `target="_blank"` sur des URLs internes (`nexora-iptv.com`, `app.nexora-iptv.com`, `www.nexora-iptv.com`, `account.nexora-iptv.com`, ou des chemins commençant par `/`).

Constaté :
- `src/routes/checkout.tsx` : CGU, CGV, confidentialité, remboursement ouvrent en `_blank` alors qu'ils sont sur le même domaine.
- `src/routes/ncc.blog.index.tsx` : preview d'article interne ouvre en `_blank` (acceptable en back-office mais à vérifier).

Action : retirer `target="_blank"` et `rel="noopener noreferrer"` des liens internes. Les liens internes doivent rester dans la WebView. Les liens externes (WhatsApp, Telegram, Facebook, Twitter, m.me, downloads APK, etc.) conservent `target="_blank" rel="noopener noreferrer"`.

## 4. Renforcement des garde-fous PWA natifs

### 4.1 `src/lib/runtime-env.ts`
Déjà présent : `isCapacitorNative()` détecte `window.Capacitor?.isNativePlatform()` et `navigator.userAgent` contenant `NexoraApp`. Vérifier que le préfixe espace dans `appendUserAgent: " NexoraApp"` est pris en compte (regex `NexoraApp` sans ancrage suffit).

### 4.2 `src/pwa/register.ts`
Déjà présent : `isCapacitorNative()` est dans les contextes refusés et `unregisterExisting()` nettoie un éventuel `/sw.js` antérieur.

### 4.3 `src/components/pwa/PwaManager.tsx`
Déjà présent : early-return `null` si natif, pas d'attache `beforeinstallprompt`/`appinstalled`.

### 4.4 `src/routes/__root.tsx`
Actuellement `<PwaManager />` est monté directement. Pour éviter toute différence SSR/client, ajouter un petit wrapper client qui n'affiche `PwaManager` qu'après hydratation, ou laisser `PwaManager` gérer sa propre détection (déjà implémenté). Option à décider à l'exécution : garder la logique interne si elle est stable, sinon wrapper avec `useHydrated`/`ClientOnly`.

## 5. Fichiers modifiés attendus

- `public/brand/android/icon-foreground.png` (asset pointer)
- `public/brand/android/icon-background.png` (asset pointer)
- `public/brand/android/icon.png` (asset pointer)
- `public/brand/android/splash.png` (asset pointer)
- `src/routes/checkout.tsx` (liens internes légaux)
- Éventuellement `src/routes/__root.tsx` si wrapper client ajouté
- Éventuellement `src/routes/ncc.blog.index.tsx` si le preview interne est corrigé

## 6. Vérification finale

- `bun run build` vert.
- Assets Android présents aux bonnes dimensions (432/432, 1024, 2732).
- Les liens internes n'ont plus `target="_blank"`.
- PwaManager court-circuite en contexte natif.

## Procédure côté wrapper Android après mise à jour des assets

```text
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
5. cd android && ./gradlew assembleRelease
```

La configuration `capacitor.config.ts` que tu as partagée est correcte (`appendUserAgent: " NexoraApp"`).