// Interrupteur central de la couche PWA (web uniquement).
//
// Réactivée : le service worker et la bannière d'installation sont actifs sur
// le web. Le wrapper Capacitor Android reste totalement exclu — voir les
// gardes de `src/pwa/register.ts` (isCapacitorNative) et le bootstrap natif
// de `src/routes/__root.tsx`.
export const PWA_ENABLED = true;