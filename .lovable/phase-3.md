# NEXORA ERP — Phase 3 : Core Business Modules

## Modules livrés

| Module        | Route                  | Service                       | Statut |
|---------------|------------------------|-------------------------------|--------|
| Dashboard     | `/ncc`                 | `getDashboardKpis`            | ready  |
| Clients       | `/ncc/clients`         | `listCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `setCustomerStatus` | ready |
| Fiche client  | `/ncc/clients/$id`     | `getCustomer`                 | ready  |
| Produits      | `/ncc/products`        | `listProducts`, `createProduct`, `updateProduct` | ready |
| Commandes     | `/ncc/orders`          | `listOrders`                  | ready  |
| Commande      | `/ncc/orders/$id`      | `getOrder`, `transitionOrderStatus`, `linkOrderToCustomer` | ready |
| Paiements     | `/ncc/payments`        | `listPayments` + registre passerelles | ready |
| Essais        | `/ncc/trials`          | `listTrials`, `createTrial`, `setTrialStatus` | ready |
| IPTV          | `/ncc/iptv`            | `listSubscriptions`, `createSubscription`, `transitionSubscription` | ready |
| Notifications | `/ncc/notifications`   | `listNotifications`, `sendNotification` | ready |
| Emails        | `/ncc/emails`          | vue filtrée (`channel=email`) | ready  |
| WhatsApp      | `/ncc/whatsapp`        | vue filtrée (`channel=whatsapp`) | ready |
| Telegram      | `/ncc/telegram`        | vue filtrée (`channel=telegram`) | ready |

## Relations entre entités

```text
customers ───┬─< subscriptions >─── products
             ├─< trials >────────── products
             ├─< orders (optionnel) >── products
             └─< customer_events (audit)

notifications  (autonome, journal multi-canal)
```

- `subscriptions.customer_id` → `customers.id` (ON DELETE CASCADE)
- `trials.customer_id` → `customers.id` (ON DELETE CASCADE)
- `orders.customer_id` → `customers.id` (ON DELETE SET NULL, **nullable** — n'affecte pas le tunnel public)
- `*.product_id` → `products.id` (ON DELETE SET NULL)

## Architecture

```text
src/
  domain/
    types.ts                       entités + enums + ORDER_TRANSITIONS
    providers/
      payments.ts                  PaymentProvider + registre (sebpay réel, 5 stubs)
      notifications.ts             NotificationChannelAdapter + registre (5 stubs)
  lib/
    ncc.functions.ts               tous les serverFns admin (un seul fichier)
  components/ncc/
    ncc-ui.tsx                     fmtDate, fmtMoney, StatusBadge
    NotificationsView.tsx          vue mutualisée centre de notifications
  routes/ncc.*.tsx                 pages module ; pas d'accès direct DB
```

**Règle d'architecture (respectée par `rg "from \"@/integrations/supabase/client\"" src/routes/ncc src/components/ncc`) :**
aucune page React n'importe le client Supabase. Tout transite par `ncc.functions.ts`,
qui valide l'admin (`has_role`) puis utilise le client service-role.

## Sécurité

- Chaque serverFn : `requireSupabaseAuth` + check `has_role(uid,'admin')` dans le handler.
- RLS strict sur les 6 nouvelles tables : `USING public.has_role(auth.uid(),'admin')` pour tous les opérateurs.
- GRANTs : `SELECT/INSERT/UPDATE/DELETE` à `authenticated`, `ALL` à `service_role`. Aucun `anon`.
- Aucun flux public modifié (`/`, `/catalog`, `/checkout`, `/payment/*`, `/api/public/sebpay/webhook`, `/admin/*`).

## Machine d'états (commandes)

```text
pending  → paid, cancelled
paid     → processing, refunded, cancelled
processing → completed, refunded, cancelled
completed → refunded
cancelled  → (terminal)
refunded   → (terminal)
```

Toute transition non listée est refusée côté serveur par `transitionOrderStatus`.

## Points d'extension

### Ajouter une passerelle de paiement
1. `src/domain/providers/payments.ts` : ajouter l'id dans `PaymentProviderId`.
2. Implémenter une classe qui respecte l'interface `PaymentProvider`.
3. L'enregistrer dans `PAYMENT_PROVIDERS`.
4. Aucune autre couche à modifier — la page `/ncc/payments` lit automatiquement le registre.

### Ajouter un canal de notification
1. `src/domain/providers/notifications.ts` : ajouter l'id dans le type `NotificationChannel` (`src/domain/types.ts`) **et** dans la liste `NOTIFICATION_CHANNELS`.
2. Migration : étendre le `CHECK (channel IN …)` de la table `notifications`.
3. Implémenter un adapter qui respecte `NotificationChannelAdapter`.
4. L'enregistrer dans `NOTIFICATION_CHANNELS_REGISTRY`.

### Ajouter une catégorie de produit
1. Ajouter la valeur dans `PRODUCT_CATEGORIES` (`src/domain/types.ts`).
2. Migration : étendre le `CHECK (category IN …)` de la table `products`.
3. Ajouter un libellé dans `CATEGORY_LABELS` (`src/routes/ncc.products.tsx`).

### Ajouter un statut de commande
1. Étendre `OrderStatus` et `ORDER_TRANSITIONS` (`src/domain/types.ts`).
2. Étendre le validator Zod dans `transitionOrderStatus`.

### Brancher MEGAOTT (Phase 4)
Créer `src/domain/providers/iptv/MegaottProvider.ts` qui implémente une interface
`IPTVProvider.provision({ subscription })`. L'appeler depuis `createSubscription`
/ `transitionSubscription` (action `activate`). Aucune autre modif UI.

## Hors scope

- Pas d'intégration réelle Stripe / PayPal / Orange / MTN / Crypto / WhatsApp / Telegram / SMS.
- Pas d'automatisation (cron, expirations auto, relances).
- Pas de bucket Storage produit (l'image est saisie en URL ; à activer en Phase 4 si besoin).
- Pas de réécriture du flux public ni des serverFns existants.