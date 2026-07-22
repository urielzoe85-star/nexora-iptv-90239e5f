## Objectif

Scoper la dernière refonte de `/legal/privacy` au sous-domaine App Store (`app.nexora-iptv.com`) uniquement. La page « À propos » reste inchangée et accessible sur les deux domaines.

## Contexte

- Le même bundle sert `nexora-iptv.com` (public) et `app.nexora-iptv.com` (App Store review).
- `src/lib/app-store-mode.ts` expose déjà `isAppStoreMode()` (activé par hostname `app.*` ou `VITE_APP_STORE_MODE`).
- Dernière édition de `src/routes/legal.privacy.tsx` : ajout mention Google Analytics 4 (G-MFZ9FD4YMB) + lien vers `/a-propos` dans la section cookies.
- L'utilisateur veut que le domaine public retrouve la version d'avant ; seul `app.*` doit afficher la nouvelle rédaction.

## Changements

### 1. `src/routes/legal.privacy.tsx` — rendu conditionnel

- Importer `isAppStoreMode` depuis `@/lib/app-store-mode`.
- Composer deux variantes de la section « Cookies » et « À propos de nous » :
  - **Version publique (par défaut)** : rétablir le texte cookies antérieur (cookies techniques strictement nécessaires, sans mention GA4 ni lien À propos dans cette section).
  - **Version App Store** : conserver la rédaction actuelle (mention GA4 + lien vers `/a-propos`).
- Sélectionner la variante via `isAppStoreMode()` au rendu.
- Ne rien changer d'autre sur la page (titres, autres sections, `head()`).

### 2. `src/routes/a-propos.tsx`

- Aucune modification. Reste accessible sur les deux domaines.
- Note : `AppStoreGate` masque déjà les liens sensibles ; `/a-propos` n'est pas dans la liste sensible donc reste visible et navigable sur `app.*`.

## Hors périmètre

- Pas de changement sur la nav, le header, le sitemap, ou le mode App Store.
- Pas de modification des autres pages légales.

## Vérification

- Ouvrir `/legal/privacy` sur le preview public → section cookies = version antérieure (sans GA4, sans lien À propos).
- Simuler `app.nexora-iptv.com` via `VITE_APP_STORE_MODE=1` → section cookies = version actuelle avec GA4 + lien À propos.
- `/a-propos` accessible sur les deux.
