# Essai gratuit : numéro WhatsApp obligatoire + alerte admin sur le bon numéro

## Constat vérifié

- Le formulaire `/essai-gratuit` exige déjà un contact, mais **seulement si** le canal choisi est WhatsApp ou Telegram (le canal « email » permet de l'éviter).
- L'alerte admin WhatsApp part vers le secret `WHATSAPP_ADMIN_PHONE`, qui n'est pas forcément identique au numéro du bouton flottant (`237698608808`).
- Les numéros du bouton flottant (`src/components/FloatingWhatsApp.tsx`) et de `src/lib/whatsapp-contact.ts` sont bien `237698608808`.

## Ce qui sera fait

1. **Numéro WhatsApp obligatoire (client)**
   - `src/routes/essai-gratuit.tsx` et `src/routes/en.free-trial.tsx` : le champ « Numéro WhatsApp » devient obligatoire dans tous les cas (libellé « Numéro WhatsApp * », validation côté client avec message d'erreur clair, même si le canal choisi est Telegram ou email — le client pourra toujours être recontacté sur WhatsApp).
   - `src/lib/trials.functions.ts` : durcir le schéma Zod pour exiger `contact` non vide (minimum de chiffres, ex. 8) quel que soit le canal.

2. **Alerte admin vers le numéro du bouton flottant**
   - Mettre à jour le secret `WHATSAPP_ADMIN_PHONE` avec la valeur `237698608808` (identique au bouton flottant) via l'outil secrets, sans toucher au code.
   - L'alerte WhatsApp existante (déjà branchée sur `notifyAdminWhatsApp`) arrivera donc sur ce numéro, en plus de Telegram.

3. **Vérification**
   - Typecheck + build de production.
   - Rappel : le message WhatsApp libre nécessite la fenêtre 24 h Meta (déjà documenté) ; sinon le fallback est Telegram et le motif est logué.

## Hors périmètre

- Aucun changement de design, aucun changement de base de données, Telegram inchangé.
