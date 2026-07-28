## Diagnostic confirmé

La PWA n’est plus la cause : elle est désactivée (`PWA_ENABLED = false`), le plugin ne génère plus de Service Worker et la bannière ne peut plus s’afficher.

Le point déterminant est l’URL de démarrage Android :

```text
https://app.nexora-iptv.com
        ↓ HTTP 302
https://nexora-iptv.com/
```

Cette redirection se produit avant le chargement du JavaScript. La garde `NativeNavigationGuard` ne peut donc pas l’intercepter. Si le wrapper autorise seulement `app.nexora-iptv.com`, Capacitor considère le passage vers `nexora-iptv.com` comme une navigation externe, la délègue à Android/Chrome et laisse la WebView blanche.

Le dépôt actuel ne contient ni `capacitor.config.*`, ni dossier `android/`, ni `AndroidManifest.xml` : le correctif principal doit être appliqué au dépôt du wrapper Android.

## Plan de correction

1. **Aligner l’URL native sur l’hôte final**
   - Remplacer `server.url: "https://app.nexora-iptv.com"` par `server.url: "https://nexora-iptv.com"`.
   - Éviter ainsi toute redirection de domaine pendant le démarrage.

2. **Autoriser explicitement tous les domaines Nexora dans la WebView**
   - Ajouter à `server.allowNavigation` :
     - `nexora-iptv.com`
     - `www.nexora-iptv.com`
     - `app.nexora-iptv.com`
     - `account.nexora-iptv.com`
   - Conserver les liens externes réellement voulus dans le navigateur système uniquement après une action utilisateur.

3. **Durcir le wrapper Android**
   - Vérifier `MainActivity` et `AndroidManifest.xml`.
   - Supprimer tout lancement automatique via `Intent.ACTION_VIEW`, `Browser.open`, `appUrlOpen` ou gestionnaire de redirection au démarrage.
   - Faire suivre les navigations Nexora au `BridgeWebView`, y compris les redirections HTTP 301/302.

4. **Nettoyer le démarrage web sans modifier le métier**
   - Conserver la PWA désactivée pendant le test.
   - Maintenir la garde native uniquement comme protection secondaire pour les clics et `window.open`; ne plus lui faire porter la responsabilité de la navigation initiale.

5. **Reconstruire et vérifier sur l’appareil réel**
   - Exécuter la synchronisation Capacitor puis reconstruire l’APK.
   - Désinstaller l’ancienne application ou effacer ses données avant installation.
   - Valider : splash → page d’accueil dans la WebView, aucune ouverture de Chrome, navigation Nexora interne stable et absence de bannière PWA.

## Prérequis d’implémentation

Le dépôt Android contenant `capacitor.config.*` et `android/` doit être ajouté ou connecté à ce projet. Sans ces fichiers, aucune modification supplémentaire du site web ne peut empêcher la redirection initiale, car elle intervient avant l’exécution du code React.