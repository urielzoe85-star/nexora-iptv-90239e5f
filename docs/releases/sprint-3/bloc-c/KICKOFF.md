# Sprint 3 — Bloc C · Compliance publique

_Opened: 2026-07-03 · Target release: v1.0.0-ga_

## Portée (S3-P0-06)

Publier les documents légaux exigés pour la vente à distance de service
numérique en Afrique de l'Ouest / UE, et matérialiser l'acceptation
contractuelle au checkout.

## Livrables

1. **Pages publiques** (indexables, versionnées) :
   - `/legal/terms`  — Conditions Générales d'Utilisation (CGU)
   - `/legal/sales`  — Conditions Générales de Vente (CGV)
   - `/legal/privacy`— Politique de confidentialité (RGPD)
   - `/legal/refund` — Politique de remboursement
   - `/legal/notice` — Mentions légales (éditeur / hébergeur)
2. **Versioning** : constante `LEGAL_VERSION` (`src/lib/legal-version.ts`)
   affichée en haut de chaque page. Bump manuel à chaque modification
   substantielle.
3. **Acceptation au checkout** : case à cocher obligatoire pointant vers
   les 4 documents ; `canPay` reste `false` tant que la case n'est pas
   cochée.
4. **Preuve d'acceptation** : `createOrder` exige `termsAccepted: true`
   côté serveur (Zod `literal(true)`), horodate l'acceptation
   (`terms_accepted_at`) et enregistre la version (`terms_version`) dans
   `orders.metadata`.
5. **SEO** : les 5 pages sont ajoutées au sitemap `sitemap.xml`.
6. **Footer** : la colonne « Légal » de la home pointe désormais vers
   les vraies URLs (`/legal/*`) au lieu de `#`.

## Validation

- Toute nouvelle commande contient `metadata.terms_version` +
  `metadata.terms_accepted_at`.
- Le checkout refuse `termsAccepted !== true` (erreur Zod).
- Les 5 pages retournent 200 et exposent une balise canonique + OG.

## Bloc suivant

Bloc D — Défense en profondeur (CSP stricte, SRI, signature artefacts).
