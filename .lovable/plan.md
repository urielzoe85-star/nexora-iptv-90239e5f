## Objectif

Remplacer le favicon et le logo Nexora par la nouvelle image fournie (marque "N" dorée sur fond bleu avec le mot NEXORA et le tagline "INNOVATE · CONNECT · EMPOWER"), sur toute l'application et la PWA. Le provider push reste **différé** — on le finalisera plus tard sur **Firebase Cloud Messaging (FCM)**, choix déjà adapté à NCC (gratuit, multi-plateforme Web/Android/iOS, fiable, s'intègre avec le service worker PWA déjà en place).

## Étapes

1. **Uploader la nouvelle image en asset CDN**
   - `lovable-assets create` depuis `/mnt/user-uploads/5C85511D-...jpeg` → `src/assets/nexora-brand.jpg.asset.json` (logo complet avec texte, pour les écrans où on affiche la marque).
   - Générer une version carrée "mark only" (juste le "N" doré sur fond bleu) pour les icônes PWA/favicon via `imagegen--edit_image` à partir de l'upload → asset CDN `src/assets/nexora-icon.jpg.asset.json`.

2. **Régénérer les icônes PWA & favicons dans `public/`**
   - `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`
   - `public/apple-touch-icon.png` (180×180)
   - `public/pwa-192.png`, `pwa-512.png`
   - `public/pwa-maskable-512.png` (avec safe zone : "N" centré, marges élargies pour Android maskable)
   
   Sources dérivées de la nouvelle image "mark only" pour rester lisibles à petite taille.

3. **Remplacer le logo dans l'UI**
   - `src/components/admin/AdminShell.tsx` : remplacer `/pwa-192.png` par l'asset logo complet.
   - `src/components/ncc/NccSidebar.tsx` : idem.
   - Vérifier autres emplacements (`FloatingWhatsApp`, header public, footer) et harmoniser si le logo Nexora y apparaît.

4. **Metadata**
   - `manifest.webmanifest` : conserver les chemins `/pwa-*.png` (les fichiers sont juste remplacés).
   - `__root.tsx` : `theme_color` et liens `apple-touch-icon` / favicons inchangés (mêmes chemins).

5. **Push notifications**
   - **Aucun changement de code maintenant.** Décision consignée : provider = **Firebase Cloud Messaging (FCM)**, à activer plus tard quand ton compte Firebase sera prêt (VAPID key + `firebase-messaging-sw.js` + config projet).

## Détails techniques

- Icônes PWA générées en PNG carré 512×512 puis redimensionnées ; version maskable avec ~20% de padding autour du "N" pour respecter la safe zone Android.
- Favicon `.ico` multi-tailles (16/32/48) généré depuis le PNG 512 pour rester net sur onglet navigateur.
- Les composants qui affichaient `/pwa-192.png` comme logo passent à l'import de l'asset JSON complet (`nexora-brand.jpg.asset.json`) pour éviter la duplication et bénéficier du CDN.
- Aucun changement de logique métier, d'auth, de RLS ou de routes.
