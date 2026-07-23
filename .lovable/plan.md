# Plan : Supprimer les raccourcis WhatsApp/Messenger flottants

## Contexte
Le chat IA Nexora est maintenant opérationnel et multilingue. L'utilisateur souhaite retirer les anciens boutons flottants WhatsApp et Messenger de l'interface publique pour ne conserver que le lanceur de l'assistant IA.

## Fichier concerné
- `src/components/FloatingWhatsApp.tsx` : contient actuellement la pile IA → WhatsApp → Messenger.

## Modifications prévues
1. **Supprimer les boutons WhatsApp et Messenger** dans `src/components/FloatingWhatsApp.tsx`.
2. **Ne conserver que le bouton Nexora AI** (logo personnalisé, halo doré, statut en ligne) avec le même comportement `aiAssistant.toggle()`.
3. **Nettoyer les imports** : retirer `buildWhatsAppLink` et toute référence aux liens WhatsApp/Messenger si le fichier ne les réutilise plus ailleurs.
4. **Renommer le composant** (optionnel mais recommandé) de `FloatingWhatsApp` vers `FloatingAiAssistant` pour refléter sa nouvelle responsabilité unique. Mettre à jour l'import dans `src/routes/__root.tsx` si renommé.
5. **Vérifier le build** : lancer la vérification TypeScript pour s'assurer qu'aucun import mort ne reste et que le layout du bouton unique reste correct (pas de flex vide inutile).

## Résultat attendu
- Un seul bouton flottant en bas à droite : le lanceur Nexora AI.
- Les anciens canaux WhatsApp/Messenger restent accessibles via les pages de contact / téléchargement / footer, mais ne sont plus en overlay fixe.
- Aucune régression sur l'ouverture du widget IA.