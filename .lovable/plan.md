# Bouton WhatsApp flottant global

## Objectif
Ajouter un bouton WhatsApp flottant, visible sur toutes les pages publiques du site, avec le logo et la couleur officiels de WhatsApp (vert #25D366), pour convertir les visiteurs en clients.

## Portée
- Visible sur toutes les pages publiques (accueil, /fr, /en, /de, plans, légal, etc.)
- Masqué sur les zones back-office : `/admin/*` et `/ncc/*` (pas pertinent pour l'équipe interne)
- Masqué sur la page checkout/paiement si on veut éviter la distraction — **à confirmer** (par défaut je le garde partout côté public)

## Design
- Bouton circulaire flottant, position `fixed bottom-right` (bottom-6 right-6, un peu plus haut sur mobile pour ne pas gêner)
- Fond vert WhatsApp officiel `#25D366`, icône blanche
- Logo = icône SVG WhatsApp officielle (glyphe blanc sur rond vert), pas l'icône lucide générique
- Ombre douce + micro-animation (pulse discret ou hover scale) pour attirer l'œil sans être agressif
- Tooltip / label optionnel « Discuter sur WhatsApp » au hover desktop
- `aria-label` accessible, `target="_blank" rel="noopener"`

## Comportement
- Lien via `buildWhatsAppLink()` existant (`src/lib/whatsapp-contact.ts`) → wa.me/237698608808
- Message pré-rempli générique visiteur : « Bonjour Nexora, je souhaite en savoir plus sur vos abonnements IPTV 🙏 »
- Tracking : simple `data-event="whatsapp_floating_click"` (pas de nouvelle dépendance)

## Implémentation technique
1. Créer `src/components/FloatingWhatsApp.tsx` — composant client, icône SVG WhatsApp inline (glyphe officiel), styles Tailwind + couleur `#25D366` en dur (couleur de marque WhatsApp, exception justifiée au design system).
2. Monter le composant dans `src/routes/__root.tsx` à l'intérieur de `RootComponent`, juste après `<Outlet />`, dans `I18nProvider`.
3. Utiliser `useRouterState` pour lire le pathname et ne pas rendre le bouton si le chemin commence par `/admin` ou `/ncc`.
4. Aucune modification des routes existantes, aucun changement backend.

## Fichiers touchés
- `src/components/FloatingWhatsApp.tsx` (nouveau)
- `src/routes/__root.tsx` (ajout du composant dans `RootComponent`)
