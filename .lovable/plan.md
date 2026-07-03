# Rendre la santé de la file d'automation accessible depuis /admin

## Contexte

Le bouton **« Drainer maintenant »** existe déjà — il se trouve dans le back-office NCC :

`/ncc/automation` → onglet **Tableau de bord** → carte **Santé de la file**

Vous êtes actuellement sur `/admin/orders` (l'ancien back-office admin), qui n'a aucun lien vers `/ncc/automation`. C'est pour ça que vous ne le voyez pas.

## Ce que je vais faire

### 1. Ajouter un raccourci visible depuis `/admin`
Dans `src/components/admin/AdminShell.tsx` (barre du haut), ajouter un bouton **« NCC · Automation »** qui ouvre `/ncc/automation` dans un nouvel onglet. Icône `Workflow`, tooltip « File d'attente & drainage IPTV ».

### 2. Bandeau d'alerte sur `/admin/orders` quand la file est bloquée
Sur la page `/admin/orders`, afficher discrètement un bandeau ambré en haut **seulement si** :
- il existe des jobs `queued` avec `attempts = 0` de plus de 2 min, OU
- des jobs `processing` bloqués > 5 min, OU
- des jobs `failed` sur les dernières 24 h.

Le bandeau contient : « X job(s) d'automation en attente » + bouton **« Drainer maintenant »** (appelle directement `adminDrainQueueNow` via `useServerFn`, mêmes toasts qu'ailleurs) + lien « Ouvrir le tableau de bord ».

Rafraîchi toutes les 10 s via `useQuery` sur `getAutomationHealth` (déjà existant, aucun nouveau serveur nécessaire).

### 3. Rien d'autre
Aucune modification de la logique de drainage, ni des workflows, ni de la DB. Uniquement de l'exposition UI.

## Fichiers touchés

- `src/components/admin/AdminShell.tsx` — ajout du bouton raccourci.
- `src/routes/admin.orders.tsx` (ou le composant de la page Commandes) — ajout du bandeau conditionnel + hook `useQuery(getAutomationHealth)`.
- Nouveau composant `src/components/admin/AutomationHealthBanner.tsx` — encapsule le bandeau + action de drainage pour rester réutilisable.

## Vérification

Après build :
1. Aller sur `/admin/orders` → voir le bandeau (si des jobs sont bloqués) et le raccourci en haut.
2. Cliquer **« Drainer maintenant »** → toast de succès, bandeau disparaît au refresh suivant.
3. Cliquer **« NCC · Automation »** → arrive directement sur `/ncc/automation` avec la carte santé complète.
