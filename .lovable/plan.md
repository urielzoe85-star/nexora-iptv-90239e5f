## Objectif

1. Ajouter des **boutons de partage social** sur chaque article de blog publié.
2. Ajouter un **bouton "Retour"** sur toutes les pages publiques pour revenir à la page précédente.

---

## 1. Boutons de partage sur les articles (`/blog/:slug`)

Créer `src/components/blog/ShareButtons.tsx` — composant client qui affiche des boutons pour :
- **WhatsApp** (`https://wa.me/?text=...`)
- **Facebook** (`https://www.facebook.com/sharer/sharer.php?u=...`)
- **X / Twitter** (`https://twitter.com/intent/tweet?...`)
- **LinkedIn** (`https://www.linkedin.com/sharing/share-offsite/?url=...`)
- **Telegram** (`https://t.me/share/url?...`)
- **Email** (`mailto:?subject=...&body=...`)
- **Copier le lien** (bouton avec `navigator.clipboard` + toast de confirmation)

Chaque bouton conserve la couleur officielle de la marque (WhatsApp vert #25D366, Facebook #1877F2, etc.) avec l'icône Lucide correspondante. URL partagée = URL canonique de l'article.

Intégration dans `src/routes/blog.$slug.tsx` :
- Une première rangée juste **sous le titre/excerpt** (partage rapide).
- Une seconde rangée en **fin d'article**, avant le CTA "Prêt à profiter…" (relance de partage après lecture).

---

## 2. Bouton "Retour" sur toutes les pages

Créer `src/components/BackButton.tsx` — bouton discret avec icône `ArrowLeft` (Lucide) qui :
- Utilise `window.history.length > 1 ? router.history.back() : navigate({ to: fallback })`.
- Accepte une prop `fallback` (par défaut `/`) pour les cas d'arrivée directe (ex : lien partagé).
- Style cohérent : `variant="ghost"`, taille `sm`, texte "Retour".

Intégration : ajouter le composant en haut de chaque page publique (sous le header, avant le contenu principal) :
- `/catalog`, `/produits/*`, `/reseller`, `/checkout`
- `/blog`, `/blog/:slug`, `/blog/categorie/:slug`
- `/espace-client/*` (téléchargements, paiement, commandes)
- Pages légales (`/legal/*`)
- `/fr` (édition française)

**Exclusions** : `/` (accueil — pas de "précédente" pertinente), `/ncc/*` (admin — a déjà sa propre navigation `AdminShell`), routes techniques (`sitemap.xml`, `rss.xml`, `/api/*`).

Le lien "← Retour au blog" existant sur `/blog/:slug` sera **conservé** (contextuel, plus explicite) ; le bouton générique s'ajoute en supplément uniquement là où rien n'existe.

---

## Détails techniques

- **Aucune modification backend** : partage = URLs standards, retour = historique navigateur côté client.
- Les nouveaux composants sont purement présentationnels (frontend).
- SSR-safe : `navigator.clipboard` et `window.history` guardés par un check `useEffect` / événement.
- Accessibilité : `aria-label` explicite sur chaque bouton de partage, focus visible, `rel="noopener noreferrer"` sur les liens externes.
