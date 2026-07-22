## Plan de correction du domaine email

### Objectif
Résoudre l'erreur `403 no_matching_sender` en alignant les routes d'envoi d'emails Lovable (`/lovable/email/*`) sur le domaine vérifié actuellement configuré : `notify.account.nexora-iptv.com`.

### État actuel confirmé
- Le code métier (`src/domain/providers/notifications.ts`, `src/lib/bulk-send.functions.ts`, etc.) utilise déjà le bon domaine `notify.account.nexora-iptv.com`.
- Les routes scaffoldées par Lovable (`src/routes/lovable/email/transactional/send.ts` et `src/routes/lovable/email/auth/webhook.ts`) sont encore en `notify.nexora-iptv.com`, ce qui crée le mismatch.

### Étapes d'implémentation
1. **Corriger `src/routes/lovable/email/transactional/send.ts`**
   - Remplacer `SENDER_DOMAIN` par `notify.account.nexora-iptv.com`.
   - Remplacer `FROM_DOMAIN` par `notify.account.nexora-iptv.com`.

2. **Corriger `src/routes/lovable/email/auth/webhook.ts`**
   - Remplacer `SENDER_DOMAIN`, `ROOT_DOMAIN` et `FROM_DOMAIN` par `notify.account.nexora-iptv.com`.

3. **Vérification globale**
   - Rechercher toute référence résiduelle à `notify.nexora-iptv.com` dans les routes email et les corriger si nécessaire.

4. **Validation**
   - Lancer le build (`bun run build` ou `tsgo`) pour vérifier l'absence d'erreur de compilation.
   - Envoyer un email de test depuis le panneau NCC → Notifications pour confirmer que l'email passe (status `sent` / `200`).

### Risques
- Aucun impact sur les fonctionnalités existantes : seule la constante de domaine change.
- Les anciens emails en DLQ dus à cette erreur ne seront pas re-joués automatiquement ; ils nécessiteront un re-trigger manuel après le fix si tu veux les renvoyer.

### Livrables attendus
- Les deux routes email utilisent `notify.account.nexora-iptv.com`.
- Build OK.
- Test email réussi depuis NCC.