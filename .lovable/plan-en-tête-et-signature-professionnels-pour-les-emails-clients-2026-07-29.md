# En-tête et signature professionnels pour les emails clients

## Objectif

Donner une identité visuelle unique à tous les emails commerciaux/clients (livraison IPTV, rappel de renouvellement, paiement confirmé, paiement échoué, futurs modèles) : bandeau d'en-tête sombre + or avec le logo Nexora, et un pied de page signé avec les coordonnées, les liens WhatsApp / Telegram / site, et le lien de désabonnement.

Les emails d'authentification (inscription, lien magique, réinitialisation, invitation, changement d'email, réauthentification) ne sont **pas** modifiés.

## Ce qui sera fait

### 1. Gabarit partagé « EmailShell »

Un composant unique servant de coquille à tous les emails clients :

- **En-tête** : bandeau sombre (navy `#0B1220`) avec le logo/nom Nexora IPTV en or (`#D4AF37`) et un liseré doré, plus un sous-titre « Votre abonnement IPTV premium ».
- **Corps** : la zone de contenu propre à chaque email, inchangée.
- **Pied de page signature** :
  - Signature : « L'équipe Nexora IPTV — Support client »
  - Coordonnées : email support, site nexora-iptv.com, espace client account.nexora-iptv.com
  - Boutons/liens de contact : WhatsApp (+237 698 608 808), Telegram (@NexoraIPTVBot), Site web
  - Mention légale courte + année dynamique
  - Ligne de désabonnement avec lien vers la page de désinscription

### 2. Application aux emails clients uniquement

Les modèles suivants sont enveloppés dans le gabarit (leur contenu métier reste identique) :

- Livraison IPTV
- Rappel de renouvellement (FR/EN, la signature suit la langue)
- Paiement confirmé
- Paiement échoué

Les modèles d'authentification restent tels quels.

### 3. Lien de désabonnement fonctionnel

Le lien du pied de page pointe vers la page publique de désinscription existante en y transmettant le jeton du destinataire. Le jeton, déjà généré à l'envoi, sera passé aux modèles pour construire une URL personnalisée ; en son absence, le pied de page affiche un lien de désinscription générique (aucun email cassé).

### 4. Page de désinscription remise à la charte

La page publique de désabonnement reçoit l'en-tête Nexora (logo, navy/or), un texte clair en français, la confirmation en un clic, et un état « déjà désabonné »/« lien invalide » lisible, avec un retour vers le site.

## Détails techniques

- Nouveau fichier `src/lib/email-templates/_shell.tsx` exportant `EmailShell` (props : `preview`, `locale`, `unsubscribeToken`, `children`) avec styles inline uniquement, `Body` en `#ffffff` (contrainte de délivrabilité), accents navy/or à l'intérieur.
- Les styles réutilisables (couleurs, boutons, textes) sont centralisés dans le même fichier pour éviter la duplication actuelle dans chaque modèle.
- `iptv-delivery.tsx`, `iptv-renewal-reminder.tsx`, `payment-confirmed.tsx`, `payment-failed.tsx` : remplacement de leur `Html/Body/Container/Heading brand/footer` par `EmailShell`, contenu métier conservé.
- `src/routes/lovable/email/transactional/send.ts` : transmission de `unsubscribeToken` dans les `templateData` passées au rendu (le jeton est déjà résolu juste avant le rendu). Aucun changement de logique d'envoi, de file d'attente ni de suppression.
- Les chaînes du pied de page FR/EN sont ajoutées à `src/lib/email-templates/i18n.ts`.
- `src/routes/unsubscribe.tsx` : mise à la charte, aucune modification de l'API `/email/unsubscribe`.
- Aucun modèle d'authentification (`signup`, `magic-link`, `recovery`, `invite`, `email-change`, `reauthentication`) n'est touché.

## Point à confirmer plus tard

L'adresse email de support affichée dans la signature : `support@nexora-iptv.com` sera utilisée par défaut, modifiable en un mot.
