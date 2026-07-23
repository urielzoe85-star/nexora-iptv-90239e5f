## Localiser /reseller et /essai-gratuit

Aujourd'hui `/reseller` est 100% en anglais et `/essai-gratuit` 100% en français. On expose les deux versions sur les bonnes URLs locales.

### 1. `/reseller` → version FR + route EN dédiée
- **Réécrire `src/routes/reseller.tsx` en français** (BENEFITS, CREDIT_PACKS, STEPS, FAQ, titres, CTA, meta FR, `og:locale` `fr_FR`, JSON-LD FR). URL canonique : `https://nexora-iptv.com/reseller`.
- **Créer `src/routes/en.reseller.tsx`** (route `/en/reseller`) avec le contenu anglais actuel : meta EN, `og:locale` `en_US`, canonical `https://nexora-iptv.com/en/reseller`, hreflang FR↔EN.
- Extraire le JSX partagé dans un composant local `ResellerContent({ copy })` pour éviter la duplication ; chaque route passe son bloc de textes.

### 2. `/essai-gratuit` reste FR + route EN `/en/free-trial`
- Garder `src/routes/essai-gratuit.tsx` tel quel (déjà FR complet).
- **Créer `src/routes/en.free-trial.tsx`** (route `/en/free-trial`) : traduction EN de INCLUDED, STEPS, FAQ, formulaire, meta EN, canonical `https://nexora-iptv.com/en/free-trial`, JSON-LD EN, appelle le même `requestFreeTrial` server function (aucune logique changée).
- Idem : composant partagé `FreeTrialContent({ copy })` pour ne pas dupliquer le formulaire et la mutation.

### 3. Liens de navigation
- Dans `src/routes/index.tsx` (hero + pricing) et footer/CTA : les `<Link to="/essai-gratuit">` et `<Link to="/reseller">` restent inchangés côté FR.
- Sur `src/routes/en.index.tsx` (et footer/nav EN si présent) : pointer vers `/en/free-trial` et `/en/reseller`. Vérifier `src/routes/en.tsx` et `src/routes/fr.tsx` pour d'éventuels liens à ajuster.

### 4. Hreflang réciproque
- Ajouter `<link rel="alternate" hreflang="fr" href=".../reseller">` et `hreflang="en" href=".../en/reseller">` sur les deux routes reseller (idem pour free-trial ↔ essai-gratuit, plus `x-default` vers la FR).

### 5. Sitemap
- Dans `src/routes/sitemap[.]xml.ts`, ajouter `/en/reseller` et `/en/free-trial` à côté des URLs FR déjà présentes.

### Hors périmètre
- Aucun changement à la logique server (`requestFreeTrial`, tables, notifications Telegram).
- Aucun changement aux prix, FAQ business, workflows, ou autres routes.
- Pas de refonte visuelle : uniquement traduction + duplication de route.