# Alerte WhatsApp pour les demandes d'essai gratuit

## Constat

Dans le code qui traite le formulaire `/essai-gratuit` (`src/lib/trials.functions.ts`), la notification admin est envoyée **uniquement à Telegram** : le bloc « best-effort » appelle directement l'API Telegram et il n'y a aucun appel WhatsApp. C'est pour cela que vous ne recevez rien sur WhatsApp.

Le client WhatsApp existe déjà et est fonctionnel côté serveur (`src/lib/whatsapp.server.ts`), avec une fonction dédiée aux alertes admin (`notifyAdminWhatsApp`) qui utilise le numéro admin configuré.

## Ce qui va être fait

1. Ajouter, à la suite de l'alerte Telegram, une alerte WhatsApp admin avec le même contenu (email, contact, canal préféré, appareil, pays).
2. Les deux canaux restent indépendants et « best-effort » : si WhatsApp échoue, Telegram passe quand même et le client reçoit toujours sa confirmation.
3. Journaliser l'échec WhatsApp éventuel (raison renvoyée par Meta) pour pouvoir diagnostiquer sans casser la demande d'essai.

## Point important sur WhatsApp

Meta n'autorise les messages texte libres que dans une fenêtre de 24 h après votre dernier message au numéro de l'entreprise. Concrètement : si le numéro admin n'a pas écrit au numéro WhatsApp Business depuis plus de 24 h, Meta refusera le message texte.

Deux options :
- **A (par défaut)** : envoi texte simple. Il suffit d'envoyer un message au numéro WhatsApp Business de temps en temps pour garder la fenêtre ouverte.
- **B** : utiliser un template Meta pré-approuvé pour les alertes (fiable 24/7), ce qui nécessite de créer et faire approuver un template côté Meta.

Le plan implémente A maintenant, avec un repli propre et un message d'erreur clair dans les logs si la fenêtre est fermée. On pourra basculer sur B ensuite si vous voulez la garantie totale.

## Détails techniques

- Fichier modifié : `src/lib/trials.functions.ts` (bloc notification admin).
- Réutilisation de `notifyAdminWhatsApp` depuis `@/lib/whatsapp.server` via import dynamique dans le handler.
- Aucun changement de base de données, aucun changement du formulaire public.
