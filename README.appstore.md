# Nexora — Soumission App Store (mode review)

Ce document décrit comment produire un build **neutralisé** de Nexora pour
la soumission sur l'Apple App Store, sans impacter le site public ni le NCC.

## 1. Activer le mode

Le mode s'active automatiquement si l'app est servie depuis :

- `app.nexora-iptv.com` (sous-domaine dédié à la review Apple)
- un scheme natif Capacitor (`capacitor://` / `ionic://`)
- ou avec la variable `VITE_APP_STORE_MODE=1` au build

## 2. Build web + contrôle anti-fuite

```bash
VITE_APP_STORE_MODE=1 bun run build
bash scripts/check-appstore-build.sh
```

Le script `check-appstore-build.sh` refuse le build si un terme IPTV /
M3U / reseller / VOD / etc. subsiste dans `dist/`.

## 3. Déploiement web

Publier le sous-domaine `app.nexora-iptv.com` avec ce build. Le Gate
(`AppStoreGate`) injecte `robots noindex,nofollow`, sanitise les meta
et les tags OG, retire les liens canonical/hreflang, et masque les
composants marqués `data-app-store="hide"` (marquee de paiements,
bandeau reseller, boutons WhatsApp/Messenger flottants).

Les endpoints suivants renvoient une version vide lorsque servis sous
`app.nexora-iptv.com` :

- `/sitemap.xml`
- `/rss.xml`
- `/robots.txt` (renvoie `Disallow: /`)

## 4. Wrapper Capacitor iOS (sur macOS)

```bash
# 1. Installer Capacitor (une fois)
bun add @capacitor/core @capacitor/cli @capacitor/ios

# 2. Build web neutralisé
VITE_APP_STORE_MODE=1 bun run build
bash scripts/check-appstore-build.sh

# 3. Générer le projet iOS
bunx cap add ios       # première fois seulement
bunx cap sync ios
bunx cap open ios      # ouvre Xcode
```

### Réglages Xcode

- **Bundle Identifier** : `com.nexora.hub`
- **Display Name** : `Nexora Hub`
- **Category** : `Lifestyle` ou `Productivity` (éviter `Entertainment`)
- **Info.plist** → `ITSAppUsesNonExemptEncryption = NO`
- **Signing** : ton Apple Developer Team ID
- **Icônes & splash** : monogramme neutre bleu marine / or, aucun slogan

### Config Capacitor (`capacitor.config.ts`)

- `appId: com.nexora.hub`
- `webDir: dist`
- `server.url: https://app.nexora-iptv.com` — le wrapper charge le web
  neutralisé du sous-domaine.
- `ios.limitsNavigationsToAppBoundDomains: true` — bloque toute
  navigation hors domaine app-bound déclaré dans `Info.plist`.

## 5. Ce que le mode ne touche PAS

- `nexora-iptv.com`, `www.nexora-iptv.com`, `account.nexora-iptv.com`
- Le NCC (`/ncc/*`, `/admin/*`)
- La base de données, les edge functions, les paiements, les emails