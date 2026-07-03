# Plan — Paiement Crypto via Binance Pay

## Choix technique
Binance ne propose pas d'API "checkout crypto générique" grand public : leur produit merchant s'appelle **Binance Pay Merchant API**. C'est ce qu'on va intégrer.

- Cryptos acceptées au checkout : **BTC, ETH, USDT (TRC20/ERC20)** — restreintes côté UI, mais Binance Pay laisse le payeur choisir dans son wallet Binance.
- **Conversion auto en fiat** : activée côté compte marchand Binance (`Auto-Convert to USDT/BUSD`) → NEXORA reçoit du stable, comptabilité simple. Rien à coder côté app pour la conversion, c'est un réglage sur le dashboard Binance Merchant.
- **Prérequis marchand** : compte **Binance Merchant** vérifié (KYB). Sans ce compte, l'API refuse les ordres. On code l'intégration, mais l'activation live dépend de la validation KYB de Binance (comme SebPay).

## Secrets requis
À demander via `add_secret` une fois le plan approuvé :
- `BINANCE_PAY_API_KEY` (fournie dans Binance Merchant → API Management)
- `BINANCE_PAY_API_SECRET`
- `BINANCE_PAY_WEBHOOK_PUBLIC_KEY` (pour vérifier la signature RSA des webhooks Binance)

## Ce qui sera construit

### 1. Provider crypto — `src/lib/payments/providers/binance-pay.server.ts`
- `createBinancePayOrder({ orderId, amount, currency, buyerEmail })` → appelle `POST https://bpay.binanceapi.com/binancepay/openapi/v3/order` avec :
  - signature HMAC-SHA512 (`BinancePay-Timestamp`, `BinancePay-Nonce`, `BinancePay-Certificate-SN`, `BinancePay-Signature`)
  - `merchantTradeNo` = ref commande NEXORA
  - `orderAmount`, `currency` (USDT par défaut si conversion auto activée)
  - `webhookUrl` = `https://nexora-iptv.com/api/public/binance-pay/webhook`
  - `returnUrl` = page `/payment/callback?provider=binance`
- Retourne `{ checkoutUrl, qrcodeLink, prepayId }`
- Helpers : `queryBinancePayOrder(prepayId)`, `verifyBinancePayWebhook(rawBody, headers)`

### 2. Server function — `src/lib/payments.functions.ts`
- Nouvelle server fn `initBinancePayCheckout({ orderId })` (public, comme SebPay) :
  - Recharge la commande, calcule le montant, appelle le provider, met `orders.payment_provider = 'binance_pay'` + `payment_intent_id = prepayId`.
  - Retourne `{ checkoutUrl, qrcodeLink }` au front.

### 3. Route publique webhook — `src/routes/api/public/binance-pay/webhook.ts`
- Vérifie la signature RSA Binance sur le raw body (clé publique en secret).
- Sur `PAY_SUCCESS` → confirme la commande + déclenche le workflow de livraison IPTV existant (même chemin que SebPay).
- Sur `PAY_CLOSED` / `PAY_FAIL` → `markOrderFailed`.
- Idempotent via `orders.payment_intent_id`.

### 4. UI Checkout — `src/routes/checkout.tsx` (ou composant équivalent)
- Ajoute une carte "Payer en crypto (Binance Pay)" à côté de SebPay, avec logos BTC/ETH/USDT et mention "Conversion automatique en USDT".
- Sur clic → appelle `initBinancePayCheckout`, redirige vers `checkoutUrl` (ou affiche le QR code pour scan mobile Binance).

### 5. Page callback
- Étendre `/payment/callback` pour lire `?provider=binance&prepayId=...`, appeler `queryBinancePayOrder`, afficher succès/attente/échec (le webhook reste la source de vérité).

### 6. Admin
- Filtre "Binance Pay" dans la liste des commandes.
- Badge crypto + montant reçu (USDT après conversion) dans la vue détail commande.

### 7. Tests E2E (Playwright)
- Checkout : sélection Binance Pay → redirection Binance sandbox.
- Webhook : POST simulé signé → commande passe à `paid` → livraison IPTV déclenchée.
- Webhook signature invalide → 401, commande inchangée.
- Idempotence : 2 webhooks `PAY_SUCCESS` → 1 seule livraison.

## Hors périmètre
- Pas d'intégration d'autres providers crypto (NOWPayments, Coinbase Commerce) — Binance uniquement, comme demandé.
- Pas de wallet non-custodial / paiement on-chain direct : tout passe par Binance Pay.
- La bascule sandbox → live dépend de la validation KYB Binance Merchant côté utilisateur.

## Ordre d'exécution après approbation
1. Demander les 3 secrets Binance Pay.
2. Coder provider + server fn + webhook + UI + admin.
3. Lancer les tests E2E en mode sandbox (mocké si secrets pas encore fournis).
