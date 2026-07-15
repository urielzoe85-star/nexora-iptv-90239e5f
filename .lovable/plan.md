## Reconfiguration API WhatsApp Cloud

Mettre à jour les secrets Meta WhatsApp Business avec tes nouvelles valeurs, puis vérifier que l'envoi fonctionne bout en bout.

### Étapes

1. **Mise à jour des secrets** via un formulaire sécurisé (aucune valeur ne transite en clair dans le chat) :
   - `WHATSAPP_PHONE_NUMBER_ID` — ID du numéro Meta Business
   - `WHATSAPP_ACCESS_TOKEN` — token d'accès permanent (System User)
   - `WHATSAPP_VERIFY_TOKEN` — (optionnel, seulement si tu veux le changer aussi ; sert au webhook + à la route de test)
   - `WHATSAPP_ADMIN_PHONE` — (optionnel, numéro admin qui reçoit les alertes)

2. **Test d'envoi réel** via la route existante `POST /api/public/whatsapp/test-send?token=<VERIFY_TOKEN>&to=<numéro E.164 sans +>` pour confirmer :
   - le `phoneNumberId` accepte le token
   - un message texte arrive bien sur le téléphone destinataire
   - retour attendu : `{ ok: true, messageId: "wamid..." }`

3. **Vérification NCC** : envoyer un message depuis la fiche commande (canal WhatsApp automatique) sur une commande de test → le `delivery_logs` doit passer en `status = "automatic"`.

### Notes

- Aucun code n'est modifié — seuls les secrets serveur changent.
- `src/lib/whatsapp.server.ts` lit `process.env.WHATSAPP_PHONE_NUMBER_ID` et `WHATSAPP_ACCESS_TOKEN` à chaque appel : la nouvelle valeur est prise en compte immédiatement après enregistrement, sans redéploiement.
- Si le token précédent avait été marqué invalide par `secret-guard`, un envoi réussi le réarme automatiquement.
- Rappel Meta : un message **texte libre** n'est autorisé que dans la fenêtre 24 h après le dernier message du client ; hors fenêtre, il faut un **template approuvé** (`sendWhatsAppTemplate`).

Confirme et je bascule en build pour ouvrir le formulaire de saisie des secrets.
