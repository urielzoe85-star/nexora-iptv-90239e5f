## Objectif

Empiler le bouton de l'assistant IA **au-dessus** du bouton WhatsApp (dans la même pile flottante) et remplacer l'icône `Sparkles` par un logo personnalisé Nexora AI.

## Étapes

### 1. Générer le logo Nexora AI
- `imagegen--generate_image` (premium, transparent) → `src/assets/nexora-ai-logo.png`
- Marque : monogramme "N" stylisé + orbite/étincelle, palette navy `#0B1E3F` + or métallique `#D4AF37`, fond transparent, lisible à 32px.

### 2. Unifier la pile flottante
Actuellement :
- `FloatingWhatsApp` → `fixed bottom-6 right-6` (WhatsApp + Messenger)
- `NexoraAssistantWidget` → bouton séparé `fixed bottom-24 right-4`

Refonte :
- Dans `src/components/ai-chat/NexoraAssistantWidget.tsx` : retirer le `fixed bottom-24 right-4` du bouton déclencheur ; exporter un `<AssistantLauncherButton />` sans positionnement (bouton rond 56–64px, gradient navy→or, `<img src={nexoraAiLogo} />` à la place de `Sparkles`). Le panneau ouvert reste `fixed` (repositionné `bottom-28 right-6` pour dégager la pile).
- Dans `src/components/FloatingWhatsApp.tsx` : ajouter `<AssistantLauncherButton />` **en premier** dans la `flex-col` (donc au-dessus de WhatsApp, puis Messenger). Conserver `gap-3`, `z-[60]`.
- `src/routes/__root.tsx` : le widget IA est déjà monté globalement — s'assurer qu'un seul lanceur est rendu (le lanceur vit désormais dans `FloatingWhatsApp`, le composant widget ne rend plus que le panneau/état).

### 3. Détails visuels
- Bouton IA : mêmes dimensions que WhatsApp (`h-14 w-14 md:h-16 md:w-16`), halo `animate-ping` doré discret, ring focus or.
- Accessibilité : `aria-label="Ouvrir l'assistant Nexora AI"`.
- Masquage identique sur `/admin` et `/ncc` (déjà géré par `FloatingWhatsApp`).

### 4. Vérification
- Build + preview mobile 428×712 : ordre visuel de haut en bas = **IA → WhatsApp → Messenger**, panneau IA ne chevauche pas la pile.

## Fichiers touchés
- `src/assets/nexora-ai-logo.png` (nouveau)
- `src/components/ai-chat/NexoraAssistantWidget.tsx` (extraction du launcher, nouvel icône)
- `src/components/FloatingWhatsApp.tsx` (intègre le launcher IA en tête de pile)

Aucun changement de logique métier ou de backend.