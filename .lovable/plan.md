## Ajouter l'animation « ping » au bouton Messenger

Aligner l'animation du bouton Messenger flottant sur celle du bouton WhatsApp : halo `animate-ping` circulaire derrière le bouton, dans la couleur Messenger.

### Modification

**`src/components/FloatingWhatsApp.tsx`**
- Dans le `<a>` Messenger, ajouter juste avant le `<svg>` le même halo que WhatsApp :
  ```tsx
  <span
    aria-hidden
    className="absolute inset-0 rounded-full animate-ping opacity-40"
    style={{ backgroundColor: "#0084FF" }}
  />
  ```
- Aucune autre modification (le dégradé du bouton, le logo éclair et le lien `m.me/1230724663450307` restent identiques).
