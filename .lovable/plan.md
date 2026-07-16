## Ajout du bouton Messenger flottant

Ajouter un bouton Facebook Messenger sous le bouton WhatsApp flottant, avec le logo et la couleur officiels Messenger, pointant vers `https://m.me/1230724663450307`.

### Modifications

**1. `src/components/FloatingWhatsApp.tsx`**
- Transformer le composant en conteneur vertical (flex-col, gap) contenant :
  - Le bouton WhatsApp existant (inchangé : #25D366, logo WhatsApp)
  - Un nouveau bouton Messenger en dessous :
    - `href="https://m.me/1230724663450307"` (target `_blank`, `rel="noopener noreferrer"`)
    - `aria-label="Discuter sur Messenger"`
    - `data-event="messenger_floating_click"`
    - Couleur officielle Messenger : dégradé bleu/violet/rose (`#0084FF` fond principal, avec le glyphe blanc classique éclair Messenger)
    - Même taille (`h-14 w-14 md:h-16 md:w-16`), même style (rond, shadow, hover:scale-110, ring focus)
    - Logo SVG officiel Messenger (bulle + éclair) en blanc
- Garder la même règle de masquage sur `/admin` et `/ncc`
- Positionnement : le conteneur reste `fixed bottom-6 right-6 z-[60]`, les deux boutons empilés verticalement (WhatsApp en haut, Messenger en dessous) — l'énoncé « en bas de celui de WhatsApp » est respecté.

Aucun autre fichier n'est touché ; pas de logique métier ni de dépendance ajoutée.
