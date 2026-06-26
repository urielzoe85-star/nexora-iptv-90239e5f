
# NEXORA ERP — Phase 3 : Core Business Modules

## ⚠️ Constat préalable

Le plan parle de réutiliser « les services métier créés lors de la phase précédente ». Or, dans le code actuel, la Phase 1 a livré le **squelette NCC** (sidebar, placeholders, dashboard mock) et **aucun service métier** : pas de dossier `src/domain/`, `src/services/`, pas d'entités, pas de repositories. Seuls existent les serverFns hérités du front public (`orders.functions.ts`, `plans.functions.ts`, `payments.functions.ts`).

Je propose donc d'inclure dans cette phase la **construction du Service Layer** qui aurait dû appartenir à la Phase 2, puis les modules UI par-dessus. Si tu as déjà commencé une Phase 2 ailleurs (autre branche, autre projet), dis-le moi avant que je lance l'implémentation.

## Architecture cible

```text
src/
  domain/                       # ← nouveau : couche métier pure (types + interfaces)
    types.ts                    # ID, Money, Status enums, pagination
    entities/
      Customer.ts
      Product.ts
      Order.ts
      Payment.ts
      Trial.ts
      Subscription.ts
      Notification.ts
    repositories/               # interfaces (ports)
      CustomerRepository.ts
      ProductRepository.ts
      OrderRepository.ts
      PaymentRepository.ts
      TrialRepository.ts
      SubscriptionRepository.ts
      NotificationRepository.ts
    services/                   # logique métier (use-cases)
      CustomerService.ts
      ProductService.ts
      OrderService.ts
      PaymentService.ts         # façade indépendante du provider
      TrialService.ts
      SubscriptionService.ts
      NotificationService.ts    # façade indépendante du canal
      DashboardService.ts       # agrège KPIs
    providers/                  # adapters branchables
      payments/
        PaymentProvider.ts      # interface commune
        SebPayProvider.ts       # réel (réutilise lib existante)
        StripeProvider.ts       # stub
        PayPalProvider.ts       # stub
        OrangeMoneyProvider.ts  # stub
        MtnMoMoProvider.ts      # stub
        CryptoProvider.ts       # stub
        registry.ts             # map id → provider
      notifications/
        NotificationChannel.ts  # interface commune
        EmailChannel.ts         # stub (logue seulement)
        WhatsAppChannel.ts      # stub
        TelegramChannel.ts      # stub
        SmsChannel.ts           # stub
        InAppChannel.ts         # stub
        registry.ts

  infrastructure/               # ← nouveau : adapters concrets (Supabase)
    supabase/
      SupabaseCustomerRepository.ts
      SupabaseProductRepository.ts
      SupabaseOrderRepository.ts
      SupabasePaymentRepository.ts
      SupabaseTrialRepository.ts
      SupabaseSubscriptionRepository.ts
      SupabaseNotificationRepository.ts
    container.ts                # composition root : construit les services

  lib/
    ncc.functions.ts            # createServerFn protégés admin, délèguent au container

  routes/ncc.*.tsx              # remplacent les placeholders, n'appellent QUE ncc.functions.ts
  components/ncc/modules/       # composants UI par module
```

**Règle stricte :** aucun composant React n'importe `@/integrations/supabase/*` ni un repository. Les pages appellent uniquement des serverFns qui appellent les services.

## Base de données (migration unique)

Nouvelles tables dans `public`, avec GRANTs + RLS (lecture/écriture réservées aux admins via `has_role`) :

- `customers` : id, email (unique), full_name, phone, country, status (`active|disabled`), notes, created_at, updated_at.
- `products` : id, sku (unique), name, description, price, currency, category (`iptv|digital|service|license|subscription`), status (`active|archived`), image_url, metadata jsonb, created_at, updated_at.
- `subscriptions` : id, customer_id, product_id, status (`pending|active|suspended|expired|cancelled`), started_at, expires_at, renewed_at, metadata, created_at, updated_at.
- `trials` : id, customer_id, product_id (nullable), status (`active|expired|converted|revoked`), expires_at, notes, created_at, updated_at.
- `notifications` : id, channel (`email|whatsapp|telegram|sms|in_app`), recipient, subject, body, status (`queued|sent|failed`), payload jsonb, created_at, sent_at.
- `customer_events` : id, customer_id, type, payload jsonb, created_at (audit fiche client).

La table `orders` existe déjà : on ajoute juste une colonne nullable `customer_id uuid references customers(id)` (backfill optionnel via email match dans la migration) sans casser le tunnel SebPay actuel — la colonne reste optionnelle et tous les flux publics ignorent son existence.

Les tables `plans`, `orders`, `email_send_log`, `user_roles`, etc. restent intactes.

## Modules livrés (UI + service)

### 1. Clients (`/ncc/clients`)
Liste paginée + recherche (email/nom/téléphone) + tri (created_at, nom) + filtre statut. Drawer/page fiche `/ncc/clients/$id` avec : infos, statut (activer/désactiver), édition inline, et **onglets** Commandes / Abonnements / Paiements / Essais / Tickets (les 4 derniers lisent via les autres services ; Tickets = placeholder, module Support hors scope). Historique = `customer_events` (créé/modifié/désactivé).

### 2. Produits (`/ncc/products`)
Grille + filtres catégorie/statut, création/édition (drawer), upload image via bucket Supabase Storage `product-images` (créé par migration, public-read). Architecture des catégories extensible (enum + helper `registerCategory`).

### 3. Commandes (`/ncc/orders`)
Liste filtrable (statut, méthode, client, période), détail `/ncc/orders/$id` avec : client lié, produit lié, paiement lié, timeline des changements de statut. Transitions de statut contrôlées par `OrderService.transition()` (machine d'états explicite). Statuts : pending → paid → processing → completed, plus cancelled / refunded.

### 4. Paiements (`/ncc/payments`)
Liste des transactions (lecture `orders` + future `payments` séparée si besoin). Détail paiement, lien commande. Sélecteur de provider dans la page de détail (lecture seule pour l'instant) ; les 6 providers sont enregistrés dans `providers/payments/registry.ts` avec une méthode `createCharge()` qui throw `NotImplementedError` sauf SebPay (déjà fonctionnel via le webhook public existant — non modifié).

### 5. Essais gratuits (`/ncc/trials`)
Création manuelle (sélection client + produit + date d'expiration), liste avec statut calculé (expiré si `expires_at < now`), bouton « révoquer ». Pas d'automatisation.

### 6. Abonnements IPTV (`/ncc/iptv`)
CRUD complet via `SubscriptionService` : create, activate, renew (étend `expires_at`), suspend, expire. Aucun appel MEGAOTT — laissé comme méthode `IPTVProvider.provision()` non câblée.

### 7. Notifications (`/ncc/emails` étendu en centre multi-canal)
Page « Centre de notifications » sous `/ncc/notifications` (nouvelle entrée sidebar dans le groupe **Services**, à côté d'Emails). Liste historique + filtre par canal. Bouton « Envoyer test » qui passe par `NotificationService.send({ channel, recipient, ... })` ; tous les canaux loguent en base avec `status='queued'` puis simulent un envoi (`status='sent'`). Les pages existantes `/ncc/emails`, `/ncc/whatsapp`, `/ncc/telegram` deviennent des vues filtrées du centre.

### 8. Dashboard évolué (`/ncc`)
`DashboardService.getKpis()` agrège : clients actifs, commandes (24h / total), revenus (somme `orders.amount where status in paid,completed`), produits actifs, abonnements actifs, essais en cours. Branche les vraies données ; le bandeau « mock » est supprimé. Les graphiques (revenue chart, activity feed) restent en mock tant qu'il n'y a pas assez d'historique, avec une note discrète.

## Sécurité

- Tous les serverFns NCC : `.middleware([requireSupabaseAuth])` + check `has_role(uid, 'admin')` (réutilise `getMyAdminStatus`).
- RLS strict sur toutes les nouvelles tables : `using (public.has_role(auth.uid(), 'admin'))` pour SELECT/INSERT/UPDATE/DELETE.
- GRANT `SELECT, INSERT, UPDATE, DELETE` à `authenticated`, `ALL` à `service_role`. Aucun `anon`.
- Bucket Storage `product-images` : public-read, write réservé aux admins.

## Hors scope (respecté)

- Pas de modification de `/`, `/catalog`, `/checkout`, `/fr`, `/en`, `/de`, `/payment/*`, `/admin/*`, `/api/public/sebpay/webhook`, `/dashboard`, `/track`, des emails, du SEO, des traductions.
- Pas de changement aux serverFns existants (`orders.functions.ts`, `plans.functions.ts`, `payments.functions.ts`, `admin.functions.ts`).
- Pas d'intégration réelle de Stripe/PayPal/Orange/MTN/Crypto/WhatsApp/Telegram/SMS — uniquement interfaces et stubs.
- Pas d'intégration MEGAOTT.
- Pas d'automatisation (cron, triggers, expirations auto).

## Documentation

À la fin : `.lovable/phase-3.md` listant modules livrés, schéma de relations (diagramme ASCII), services et leurs méthodes, points d'extension (où brancher un nouveau provider, canal, catégorie produit, statut de commande).

## Validation

- `bun run build` passe.
- Tous les flux publics existants restent fonctionnels (test manuel via preview).
- Chaque page NCC nouvelle s'affiche et utilise la vraie DB.
- `rg "from \"@/integrations/supabase/client\"" src/routes/ncc src/components/ncc` ne ressort **rien** (aucun import direct depuis l'UI).

## Volume estimé

~45 nouveaux fichiers, 1 migration SQL, 0 fichier supprimé, ~6 fichiers existants modifiés (sidebar + registre `modules.ts` pour passer les modules de `preparing` à `ready`, plus le dashboard).

---

**Confirme** pour que je lance l'implémentation, ou indique :
1. Si une Phase 2 (service layer) existe déjà ailleurs qu'il faudrait importer plutôt que recréer.
2. S'il faut retirer un module de cette phase (ex. décaler IPTV à plus tard).
3. Si tu préfères que je livre en plusieurs sous-itérations (ex. d'abord Service Layer + Clients + Produits, puis le reste).
