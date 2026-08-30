Plan : Réintégrer le bouton WhatsApp flottant à côté du bouton Nexora AI

Objectif
Restaurer un bouton WhatsApp flottant avec le logo/couleur d'origine, positionné à côté du bouton Nexora AI existant, comme c'était le cas avant sa suppression.

État actuel confirmé
- Le composant `FloatingWhatsApp.tsx` n'existe plus (supprimé lors d'un précédent changement).
- Seul `FloatingAiAssistant.tsx` est monté dans `src/routes/__root.tsx`, en bas à droite.
- Le numéro de support utilisé ailleurs sur le site est `237698608808` (lien `https://wa.me/237698608808`).
- Le bouton IA est masqué sur les routes `/admin` et `/ncc`.

Changements prévus

1. Recréer `src/components/FloatingWhatsApp.tsx`
   - Icône/logo WhatsApp original (vert `#25D366`, logo blanc).
   - Lien vers `https://wa.me/237698608808?text=Bonjour%20Nexora%20IPTV%20%F0%9F%91%8B`.
   - Bouton rond flottant, même taille que le bouton IA (h-14 w-14 / md:h-16 md:w-16).
   - Masqué sur `/admin` et `/ncc`, comme le bouton IA.
   - Attributs `aria-label`, `rel="noopener noreferrer"`, `target="_blank"`.

2. Créer `src/components/FloatingActions.tsx`
   - Conteneur fixé en bas à droite (`bottom-6 right-6 z-[60]`).
   - Empile verticalement le bouton IA en haut et le bouton WhatsApp juste en dessous, avec un espace entre les deux.
   - Réutilise `FloatingAiAssistant` et `FloatingWhatsApp` sans modifier leur logique interne.
   - Applique la règle de masquage `/admin` et `/ncc` au conteneur pour éviter la duplication de logique.

3. Mettre à jour `src/routes/__root.tsx`
   - Remplacer `<FloatingAiAssistant />` par `<FloatingActions />`.
   - S'assurer que le conteneur est bien rendu en dehors de `<ClientOnly>` pour qu'il apparaisse immédiatement (le bouton IA l'était déjà).

4. Vérification
   - Build TypeScript sans erreur.
   - Visuel : les deux boutons sont visibles en bas à droite sur les pages publiques, le WhatsApp est vert avec le logo original, le clic ouvre WhatsApp Web/app.
   - Les boutons sont absents de `/admin/*` et `/ncc/*`.
