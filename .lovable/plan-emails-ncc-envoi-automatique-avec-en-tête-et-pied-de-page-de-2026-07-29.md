# Emails NCC : envoi automatique avec en-tête et pied de page de marque

## Problème

Dans **NCC → Emails**, le formulaire d'envoi manuel produit encore un email brut :
un simple cadre blanc avec le sujet en titre et le texte en dessous. Il n'utilise
pas le gabarit de marque (bande navy + logo or, signature professionnelle,
WhatsApp / Telegram / site / espace client, lien de désabonnement) mis en place
pour les emails clients.

## Ce qui va changer

1. **Nouveau modèle « Message Nexora »** — un gabarit générique qui reprend
   exactement l'habillage des autres emails clients : en-tête navy/or, carte
   blanche avec le sujet en titre, le message rédigé dans le NCC (sauts de ligne
   conservés), puis la signature complète et le lien de désabonnement.
2. **Branchement automatique** — l'envoi depuis l'onglet Emails passe désormais
   par ce gabarit. Aucun changement dans l'interface : vous écrivez destinataire,
   sujet, message, et l'email part déjà habillé, avec sa version texte brut pour
   la délivrabilité.
3. **Conservation de l'existant** — file d'attente, journal d'envoi, liste de
   suppression, token de désabonnement et déclenchement immédiat de la file
   restent identiques. Les emails d'authentification ne sont pas touchés.
4. **Envoi d'un aperçu réel** à **urielzoe85@gmail.com** une fois le gabarit en
   place, pour que vous puissiez juger le rendu dans votre boîte.

## Détails techniques

- Ajout de `src/lib/email-templates/ncc-notification.tsx` : composant React Email
  utilisant `EmailShell` + les styles partagés `s`, props `subject`, `body`,
  `unsubscribe_token`. Enregistré dans `registry.ts` sous `ncc-notification`
  (il devient donc aussi visible dans l'aperçu des modèles).
- `src/domain/providers/notifications.ts` (classe `EmailChannel`) : remplacement
  du HTML inline par un rendu `render()` du nouveau composant (HTML + `plainText`),
  le token de désabonnement déjà récupéré étant passé en prop. Le reste du
  pipeline (`email_send_log`, `enqueue_email`, `email_queue_dispatch`) est inchangé.
- Le rendu React Email s'exécute côté serveur uniquement (adapter chargé
  dynamiquement dans la fonction serveur), donc pas d'impact sur le bundle client.
- Aperçu : envoi via le canal email existant vers urielzoe85@gmail.com, puis
  vérification du statut dans `email_send_log`.
