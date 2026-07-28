# Correctif — Chrome s'ouvrait au lieu de rester dans la WebView

## Cause

```
curl -I https://app.nexora-iptv.com/
HTTP/2 302
location: https://nexora-iptv.com/
```

`capacitor.config.json` démarrait sur `https://app.nexora-iptv.com`, sans
`allowNavigation`. Au boot, Android recevait la redirection 302 vers un autre
hôte, la traitait comme une navigation externe (`Intent.ACTION_VIEW`), lançait
Chrome et laissait la WebView blanche. Cela se produit avant tout code React :
aucune protection côté site ne pouvait l'intercepter.

## Correctif

Voir `capacitor.config.ts` et `capacitor.config.json` à la racine du projet :

- `server.url` = `https://nexora-iptv.com` (hôte final, plus de 302 au boot)
- `server.androidScheme` = `https`
- `server.allowNavigation` = `nexora-iptv.com`, `*.nexora-iptv.com`

`MainActivity.java` et `build.gradle` restent inchangés : ce sont les fichiers
standards générés par Capacitor, sans intercepteur d'URL.

## Déploiement

1. Copier `capacitor.config.ts` et `capacitor.config.json` dans le dépôt du wrapper Android.
2. `npx cap sync android`
3. Reconstruire l'APK / AAB.
4. Désinstaller l'ancienne application sur l'appareil (ou effacer ses données)
   avant d'installer la nouvelle — l'ancienne URL de démarrage et les caches
   WebView survivent sinon à la mise à jour.

## Vérification attendue

- Splash Nexora -> page d'accueil dans la WebView, pas d'écran blanc.
- Chrome ne s'ouvre plus automatiquement.
- Blog, checkout et espace client restent dans l'application.
- Les liens réellement externes restent gérés par `NativeNavigationGuard`,
  uniquement après une action utilisateur.
