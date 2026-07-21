## Objectif

Créer une vitrine publique conforme Apple App Store sous `/app` (**NEXORA Smart Services**) sans toucher au site commercial existant, au NCC, aux workflows, ni aux données. L'espace client garde son UI mais son vocabulaire IPTV est neutralisé.

## Architecture

```text
/                         → site commercial actuel (inchangé)
/fr, /en, /de, /catalog…  → inchangés
/app                      → NOUVELLE vitrine iOS (Smart Services)
  /app                    → accueil
  /app/apps               → applications recommandées (App Store / Play / Microsoft)
  /app/compatibility      → appareils compatibles
  /app/help               → FAQ / tutoriels / support
  /app/about              → à propos + mentions
/espace-client/*          → conservé, vocabulaire re-libellé
```

L'app iOS pointera vers `https://nexora-iptv.com/app`. Le reste du site continue à fonctionner et à être indexé normalement.

## Nouveau design (/app uniquement)

- Palette claire, style Apple : fond blanc / gris très clair, typographies fines (SF-like via Inter tight tracking + Playfair pour titres légers), ombres douces, coins 2xl, sections aérées.
- Tokens locaux (`--app-bg`, `--app-fg`, `--app-muted`, `--app-accent`) scoppés à un layout `app.tsx`, sans casser le thème sombre gold du site principal.
- Animations discrètes (fade/slide via Motion déjà présent), mobile-first, header sticky minimal, nav bottom-like sur mobile.

## Contenu par section (accueil /app)

1. **Hero** — « NEXORA » + sous-titre demandé + CTA « Découvrir » (ancre vers apps).
2. **Pourquoi Nexora ?** — 3 cartes : découvrir, comparer, installer depuis les stores officiels.
3. **Applications recommandées** — grille de cartes (nom, description, boutons store officiels uniquement). Zéro APK, zéro lien direct, zéro mention IPTV/M3U/Xtream/playlist.
4. **Compatibilité** — grille iPhone, iPad, Android, Android TV, Google TV, Apple TV, Windows, macOS, Smart TV (icônes lucide, pas de photos IPTV).
5. **Centre d'aide** — FAQ / Tutoriels / Support / Guide d'installation (liens internes vers `/app/help`).
6. **À propos** — texte fourni.
7. **Mentions** — disclaimer exact fourni, encadré discret en bas.
8. **Footer /app** — mentions légales minimales, aucun lien vers checkout/tarifs/blog/reseller.

## Contraintes strictes /app

- Aucune mention : abonnement, tarif, paiement, commander, identifiants, activation, streaming, films, séries, chaînes, portail IPTV, M3U, Xtream, playlist.
- Aucun lien vers `/checkout`, `/catalog`, `/produits`, `/reseller`, `/track`, `/blog`, `/fr`, `/en`, `/de` depuis /app.
- Boutons stores → URLs officielles uniquement (App Store, Google Play, Microsoft Store). Confirmés au moment de l'implémentation.
- `head()` de chaque route /app : `robots: noindex, follow` pour éviter toute collision SEO avec le site commercial. `canonical` self-référent.

## Espace client (renommage UI uniquement)

Aucune logique modifiée. Renommage des libellés visibles :

| Actuel | Nouveau |
|---|---|
| Mes commandes | Mes demandes |
| Renouvellement / Abonnement IPTV | Mon service |
| Identifiants IPTV / M3U / Xtream | Informations d'accès |
| Téléchargements (apps IPTV) | Applications recommandées |
| Support IPTV | Assistance |

Les libellés backend, colonnes DB, endpoints, workflows restent identiques. Uniquement les strings JSX de `espace-client.*.tsx` changent.

## Ce qui NE change pas

- `/`, `/fr`, `/en`, `/de`, `/catalog`, `/checkout`, `/produits/*`, `/reseller`, `/blog/*`, `/track`, `/payment.*`, `/legal.*`, `/galerie`.
- Tout `/ncc/*`, `/admin/*`.
- Toutes les API server functions, workflows, tables Supabase, RLS, secrets, connectors, PWA manifest, GA, sitemap, RSS.
- Le blog reste en ligne mais **n'est pas linké** depuis /app.

## Fichiers à créer

- `src/routes/app.tsx` — layout `<Outlet />` + header/footer clairs + provider de thème light scoped.
- `src/routes/app.index.tsx` — accueil (toutes les sections ci-dessus).
- `src/routes/app.apps.tsx` — liste complète des applications recommandées.
- `src/routes/app.compatibility.tsx` — grille d'appareils.
- `src/routes/app.help.tsx` — FAQ + tutos + guide + lien support.
- `src/routes/app.about.tsx` — À propos + mentions.
- `src/components/app/*` — `AppHeader`, `AppFooter`, `AppShell`, `AppCard`, `StoreBadge`, `DeviceGrid`, `FaqSection`.
- `src/styles/app-theme.css` (importé par `app.tsx`) — tokens light scopés à `[data-theme="app"]`.

## Fichiers modifiés

- `src/routes/espace-client.*.tsx` — chaînes de caractères renommées (aucun changement de logique).
- `src/routes/sitemap[.]xml.ts` — /app volontairement exclu (noindex).

## SEO / performance

- Aucun changement sur les URLs existantes.
- /app en `noindex` → pas de cannibalisation, pas de risque de mélange sémantique avec le site IPTV.
- Sitemap actuel intouché, RSS blog intouché, GA intouché.
- Lazy loading / responsive images réutilisés via `ResponsiveImage`.

## Validation

- Build TS/Vite passe.
- `/` charge identique (visuel gold sombre).
- `/app` charge en design clair Apple-like, sans aucune mention IPTV/tarif/paiement.
- `/espace-client` charge avec libellés neutres, mais mêmes routes et données.
- `/ncc` inchangé.
- Playwright rapide : screenshot `/`, `/app`, `/espace-client` pour confirmer.
