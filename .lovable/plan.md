# Carrousel de moyens de paiement

Ajouter une bande défilante (carrousel infini automatique) affichant les logos officiels des moyens de paiement acceptés : **Stripe, PayPal, Visa, Mastercard, Orange Money, MTN MoMo, Moov Money, Airtel Money, Binance Pay**.

## Emplacements
1. **Page d'accueil** (`src/routes/index.tsx`) — bande discrète juste au-dessus du footer (section "Paiements sécurisés & acceptés").
2. **Checkout** (`src/routes/checkout.tsx`) — bande sous le récap de commande pour rassurer avant validation.
3. **Page de paiement portail** (`src/routes/espace-client.pay.$ref.tsx`) — bande en bas du bloc de paiement.

## Composant
Créer `src/components/PaymentMethodsMarquee.tsx` :
- Défilement horizontal automatique en boucle (CSS `@keyframes` translateX, sans lib).
- Pause au survol desktop.
- Hauteur ~40–56px, logos en niveaux de gris clair + retour couleur au hover (optionnel : garder couleur d'origine si le client préfère).
- Accessibilité : `aria-label="Moyens de paiement acceptés"`, logos avec `alt`, `role="list"`.
- Duplication de la liste 2× pour un défilement continu sans "saut".
- Responsive : logos plus petits en mobile.

## Assets
Récupérer les 9 logos SVG/PNG officiels et les uploader via `lovable-assets` (CDN) dans `src/assets/payments/` :
- `stripe.svg.asset.json`
- `paypal.svg.asset.json`
- `visa.svg.asset.json`
- `mastercard.svg.asset.json`
- `orange-money.png.asset.json`
- `mtn-momo.png.asset.json`
- `moov-money.png.asset.json`
- `airtel-money.png.asset.json`
- `binance-pay.svg.asset.json`

Source : logos officiels (wikimedia / brand kits). SVG privilégié pour Stripe/PayPal/Visa/MC/Binance, PNG transparent pour les opérateurs mobile money africains.

## Animation CSS
Ajouter dans `src/styles.css` un utility `@keyframes marquee` (translate -50% sur la piste dupliquée, durée ~30s linéaire infinie) + classe `.animate-marquee` + `.pause-on-hover:hover`.

## Aucun changement fonctionnel
- Pas de modification du flux de paiement ni des providers actifs.
- Purement visuel / rassurance de conversion.

## Vérification
- Build passe.
- Screenshot Playwright de la home + checkout pour confirmer le rendu du carrousel et le défilement.
