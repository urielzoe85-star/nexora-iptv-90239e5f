Le sous-domaine `account.nexora-iptv.com` est maintenant connecté. Le middleware existant redirige déjà sa racine vers `/espace-client` et renvoie les routes marketing vers `www.nexora-iptv.com`. Il reste à polir l'intégration pour que le portail soit pleinement utilisable et bien référencé.

## Prochaines étapes

### 1. Vérifier le routage en ligne
- Ouvrir `https://account.nexora-iptv.com` dans un navigateur : doit rediriger vers `https://account.nexora-iptv.com/espace-client`.
- Confirmer que la page de connexion s'affiche correctement.

### 2. Mettre à jour les métadonnées de `/espace-client`
Remplacer les URLs `nexora-iptv.com/espace-client` par `account.nexora-iptv.com/espace-client` dans :
- `og:url`
- `canonical`
- éventuellement le titre/description si on veut insister sur le sous-domaine dédié

Cela renforce le positionnement de `account.nexora-iptv.com` comme l'URL officielle de l'espace client.

### 3. Mettre à jour les liens "Espace client" sur le site marketing
Dans la navigation (`src/routes/index.tsx`) :
- Sur `www.nexora-iptv.com`, le lien "Espace client" doit pointer vers `https://account.nexora-iptv.com/espace-client` (lien externe `<a>`), pas vers `/espace-client` en interne.
- Sur `account.nexora-iptv.com`, le lien peut rester interne (`/espace-client`).

Idem pour le menu mobile.

### 4. (Optionnel) Page d'accueil du portail
Ajouter une petite page ou bannière sur `account.nexora-iptv.com/` qui confirme que l'utilisateur est sur le portail client et lui propose de se connecter / s'identifier. Cela évite la redirection brute et rassure l'utilisateur.

### 5. Publier les changements
- Les modifications frontend nécessitent un clic sur **Update** dans la boîte de dialogue de publication pour être live.
- Les changements de middleware/server sont déployés automatiquement.

## Validation finale
- Test `https://account.nexora-iptv.com` → `/espace-client` OK.
- Test lien depuis `www.nexora-iptv.com` → ouvre bien le sous-domaine dédié.
- Aucun lien interne ne pointe plus vers `nexora-iptv.com/espace-client` dans le contexte marketing.