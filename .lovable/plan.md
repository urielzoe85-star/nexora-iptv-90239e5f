## Constats

- La commande récente `NX-26X8KWHZ89` est `completed`, mais `metadata.iptv_delivery` est vide : côté client, le suivi reste donc bloqué à l’étape “identifiants envoyés”.
- Le workflow `payment-confirmed` peut se terminer en “success” sans rien attribuer quand la commande est déjà `completed`, même si aucune fiche IPTV n’existe.
- La commande `NX-LB6UV2822A` échoue sur MEGAOTT : `POST /api/v1/user` retourne 405. Comme le provider MEGAOTT est actif, le système tente l’API distante au lieu d’utiliser le stock local disponible.
- Il existe pourtant des comptes IPTV `available` en base, utilisables immédiatement pour attribuer des accès au client.
- L’accès `/ncc` dépend d’un cookie HttpOnly de déverrouillage ; après saisie du mot de passe, la navigation peut repartir sur l’identification si le cookie n’est pas encore pris en compte ou si le layout vérifie trop tôt.

## Plan de correction

1. **Rendre l’attribution IPTV robuste**
   - Modifier `createIptvSubscription` pour chercher d’abord un compte IPTV local `available` adapté.
   - Si un compte est disponible, l’assigner à la commande, passer son statut à `active`, remplir `order_id`, `customer_id`, `expires_at` et `metadata.order_ref`.
   - Ne tenter MEGAOTT que si aucun compte local disponible n’est trouvé, ou si le stock local est vide.
   - En cas d’erreur MEGAOTT 4xx/5xx, basculer automatiquement vers le stock local au lieu de bloquer toute la livraison.

2. **Corriger le garde du workflow `payment-confirmed`**
   - Remplacer le calcul “déjà traité” par une condition stricte : ne sauter le workflow que si `metadata.iptv_delivery.delivery_status === 'sent'` avec un `iptv_account_id` réel.
   - Ainsi, une commande `completed` mais sans fiche IPTV sera reprovisionnée et envoyée.

3. **Forcer une vraie composition + dispatch des identifiants**
   - Garantir que `delivery:compose` écrit `orders.metadata.iptv_delivery`.
   - Garantir que `delivery:dispatch` met `delivery_status: sent` dès qu’au moins l’email est mis en file.
   - Le suivi client passera alors de “en attente” à “identifiants envoyés”.

4. **Corriger la confirmation admin**
   - Faire pointer `adminConfirmPayment` vers le bon émetteur automation et éviter les doublons silencieux.
   - Après confirmation, déclencher le workflow en mode fiable, puis invalider l’affichage admin.

5. **Réparer l’accès NCC après mot de passe**
   - Après `verifyNccAccess`, naviguer vers `/ncc/` avec `replace: true` et invalider/rafraîchir l’état route si nécessaire.
   - Dans le layout `/ncc`, ajouter une courte revérification du cookie si la première lecture retourne “locked” juste après le déverrouillage.
   - Conserver la sécurité : pas de retour à `sessionStorage` comme preuve d’accès.

6. **Ajouter une action admin de rattrapage visible**
   - Sur `/admin/automation`, faire de “Attribuer maintenant” une action qui attribue + compose + envoie directement pour une référence `NX-...`.
   - Afficher un message clair si MEGAOTT est indisponible mais qu’un compte local a été utilisé.

7. **Validation**
   - Vérifier en base qu’une commande corrigée contient `metadata.iptv_delivery` avec `delivery_status: sent`.
   - Vérifier qu’un `delivery_logs` email existe et qu’un `email_send_log` est créé.
   - Vérifier que `/track?ref=...` affiche les identifiants comme envoyés.
   - Vérifier que le bouton “Accéder au NCC” ouvre `/ncc/` après le mot de passe sans revenir à l’identification.