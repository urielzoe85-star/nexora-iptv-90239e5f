## Problème

Le groupe "Contenu" (Blog, Catégories, Tags) est bien déclaré dans `src/lib/ncc/modules.ts`, mais `NccSidebar.tsx` ne l'affiche pas : la constante `GROUP_ORDER` liste seulement `cockpit`, `sales`, `services`, `ops`, `system` — `content` est absent, donc les entrées du blog sont filtrées à l'affichage.

## Correctif

**`src/components/ncc/NccSidebar.tsx`** — ajouter `"content"` à `GROUP_ORDER`, entre `services` et `ops` (ordre naturel : Contenu apparaît après Services, avant Opérations) :

```ts
const GROUP_ORDER: ModuleGroup[] = ["cockpit", "sales", "services", "content", "ops", "system"];
```

Aucun autre changement nécessaire — les modules Blog / Catégories / Tags sont déjà `status: "ready"` avec les bonnes routes (`/ncc/blog`, `/ncc/blog/categories`, `/ncc/blog/tags`).

## Vérification

1. Ouvrir NCC → la sidebar affiche désormais la section **Contenu** avec Blog, Catégories, Tags.
2. Cliquer sur Blog → la liste des articles s'ouvre à `/ncc/blog`.
