## Cause confirmée

Vérification faite à l'instant :

```text
curl -I https://app.nexora-iptv.com/
HTTP/2 302
location: https://nexora-iptv.com/
```

Ton `capacitor.config.json` démarre sur `https://app.nexora-iptv.com` et ne déclare aucun `allowNavigation`. Au démarrage, Android charge cette URL, reçoit la redirection 302 vers un **autre hôte**, considère cette navigation comme externe, la délègue à Chrome et laisse la WebView vide. Cela se produit avant tout code React, donc aucune protection côté site ne peut l'empêcher.

## Correctif (fichiers du wrapper Android)

### 1. `capacitor.config.json`

```json
{
  "appId": "com.nexora.app",
  "appName": "Nexora",
  "server": {
    "url": "https://nexora-iptv.com",
    "cleartext": false,
    "androidScheme": "https",
    "allowNavigation": [
      "nexora-iptv.com",
      "*.nexora-iptv.com"
    ]
  }
}
```

### 2. `capacitor.config.ts` (même contenu, source de vérité)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexora.app',
  appName: 'Nexora',
  server: {
    url: 'https://nexora-iptv.com',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['nexora-iptv.com', '*.nexora-iptv.com'],
  },
};

export default config;
```

Deux changements essentiels : démarrer directement sur l'hôte final (plus de 302 au boot) et autoriser explicitement tous les sous-domaines Nexora (`www`, `app`, `account`) pour que les redirections internes, le checkout et l'espace client restent dans la WebView.

### 3. `MainActivity.java` et `build.gradle`

Aucune modification nécessaire : `MainActivity` est le `BridgeActivity` standard sans intercepteur d'URL, et le `build.gradle` est le fichier généré par Capacitor. Ils ne sont pas en cause.

## Procédure de déploiement

1. Appliquer les deux fichiers de config ci-dessus dans le dépôt du wrapper.
2. Exécuter `npx cap sync android`.
3. Reconstruire l'APK/AAB.
4. **Désinstaller l'ancienne app** sur la tablette (ou effacer ses données) avant d'installer la nouvelle : les anciens caches WebView et l'ancienne URL de démarrage survivent sinon à la mise à jour.

## Vérification attendue après correctif

- Splash Nexora → page d'accueil affichée dans la WebView, pas d'écran blanc.
- Chrome ne s'ouvre plus automatiquement.
- Navigation interne (blog, checkout, espace client) reste dans l'app.
- Les liens réellement externes (réseaux sociaux, etc.) restent gérés par la garde native déjà en place côté site, uniquement après action utilisateur.

## Côté projet web (ce que je peux faire ici)

Deux options possibles selon ton choix :

- **Option A (recommandée)** — Ne rien changer sur le site. Le correctif natif suffit.
- **Option B** — Si tu tiens à conserver `app.nexora-iptv.com` comme URL de démarrage, il faut supprimer la redirection 302 de cet hôte au niveau des domaines du projet et faire de `app.nexora-iptv.com` un domaine servant directement l'app. C'est un réglage de domaines, pas de code.

## Détails techniques

La règle Capacitor appliquée est `WebViewLocalServer` / `shouldOverrideUrlLoading` : toute URL dont l'hôte n'est pas `server.url` ni listé dans `server.allowNavigation` déclenche un `Intent.ACTION_VIEW` → navigateur système. Le passage `app.nexora-iptv.com` → `nexora-iptv.com` tombait exactement dans ce cas.
