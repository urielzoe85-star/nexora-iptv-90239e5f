## Corrections SEO page d'accueil (FR)

Cible : score SEO 72 → 90+, focus mot-clé « abonnement IPTV » pour le marché francophone.

### 1. Métadonnées FR (src/routes/index.tsx `head()`)
Remplacer les balises actuelles en anglais par :
- **Title** : `Abonnement IPTV Premium Francophone 4K | Nexora IPTV`
- **Description** : `Profitez de milliers de chaînes TV, films et séries en 4K avec Nexora IPTV. Activation instantanée, essai gratuit 24h et support 24/7.`
- **og:title / og:description / twitter** : versions FR alignées, sans entités HTML brutes (pas de `&amp;` ni `&#x27;` — utiliser `et`, `&`, apostrophes typographiques `'`).
- `og:locale` = `fr_FR`.

### 2. Nettoyage entités HTML
Auditer `src/i18n/messages.ts` (bloc FR) et titres/descriptions du `head()` pour supprimer toute occurrence brute `&amp;`, `&#x27;`, `&quot;`. Remplacer par `&`, `'`, `"` directs (React échappe automatiquement).

### 3. H2 sémantiques (mot-clé « abonnement IPTV »)
Dans `src/i18n/messages.ts` (locale FR uniquement), enrichir :
- `features.title` → « Pourquoi choisir un **abonnement IPTV Nexora** »
- `pricing.title` → « Choisissez votre **abonnement IPTV** »
- `devices.title` → « Regardez votre **abonnement IPTV** partout »
- `how.title` → conserver mais viser « Activer son abonnement IPTV en 3 étapes »

Les autres langues restent inchangées.

### 4. Maillage interne contextuel
Ajouter dans le hero (ou juste sous le sous-titre) une phrase courte avec 2 liens TanStack `<Link>` :
- vers `/essai-gratuit` (ancre « essai gratuit 24h »)
- vers `/reseller` (ancre « programme revendeur IPTV »)

Ajouter aussi un lien contextuel « essai gratuit » dans la section pricing et un lien « devenir revendeur » dans le footer/CTA final si absent. Utiliser des ancres descriptives (pas « cliquez ici »).

### 5. Vérification
- Rebuild + inspection DOM pour confirmer titre/description FR, absence d'entités brutes, présence des liens internes.
- Marquer les findings SEO comme fixed via `seo_chat--update_findings` après vérif.

### Hors périmètre
Aucun changement business logic, aucun changement sur `/en`, `/fr`, ou routes autres que l'accueil `/`.
