## Diagnostic confirmé

La couche PWA est déjà neutralisée (`PWA_ENABLED = false`, plugin PWA désactivé, aucun manifest chargé). Elle n’explique donc plus l’ouverture actuelle de Chrome.

Le dépôt actuel ne contient ni `capacitor.config.*`, ni dossier `android/`, ni `MainActivity` : le wrapper Android se trouve dans un autre dépôt. La correction native définitive devra y être appliquée.

## Plan d’action

1. **Instrumenter temporairement la version web**
   - Ajouter un diagnostic actif uniquement dans le contexte `NexoraApp`/Capacitor.
   - Capturer avant exécution les appels à `window.open`, `location.assign`, `location.replace`, les clics sur liens externes/`target="_blank"` et les redirections visibles.
   - Conserver localement l’URL, la méthode et la page source afin d’identifier exactement le déclencheur sans exposer de données sensibles.
   - Afficher une petite erreur de diagnostic dans la WebView au lieu de laisser celle-ci devenir blanche pendant le test.

2. **Neutraliser les sorties automatiques au démarrage**
   - En contexte Capacitor uniquement, bloquer toute ouverture externe qui ne résulte pas d’une action explicite de l’utilisateur.
   - Garder les liens et routes Nexora (`nexora-iptv.com`, `www`, `app`, `account`) dans la même WebView.
   - Ne pas modifier les parcours métier du site web normal, les paiements ou OAuth hors application native.

3. **Auditer le dépôt Android dès qu’il est disponible**
   - Contrôler `capacitor.config.*`, `AndroidManifest.xml` et `MainActivity`.
   - Vérifier l’URL de démarrage, `allowNavigation`, les intent filters, `WebViewClient.shouldOverrideUrlLoading`, `WebChromeClient.onCreateWindow` et les éventuels appels `ACTION_VIEW`.
   - Identifier avec une référence fichier/ligne l’appel natif exact qui délègue actuellement l’URL à Chrome.

4. **Corriger définitivement le wrapper**
   - Garder tous les domaines Nexora autorisés dans la WebView.
   - Réserver Chrome aux liens externes explicitement activés par l’utilisateur.
   - Gérer `target="_blank"` sans créer une activité Chrome involontaire.
   - Restaurer une page interne valide si une navigation est refusée, afin d’éviter l’écran blanc.

5. **Valider sur Android réel**
   - Tester démarrage à froid, retour arrière, liens internes, espace client, téléchargement, OAuth et paiement.
   - Confirmer : splash → accueil dans la WebView, aucune ouverture automatique de Chrome, aucune page blanche et navigation Nexora entièrement interne.
   - Retirer ensuite l’instrumentation temporaire en conservant uniquement les protections natives définitives.

## Élément nécessaire

Après l’instrumentation web, il faudra fournir ou connecter le dépôt contenant le wrapper Android (`capacitor.config`, dossier `android`) pour terminer les étapes 3 à 5.