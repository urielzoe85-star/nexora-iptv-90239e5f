# Plan : connexion GitHub (Git sync) pour Nexora

## Objectif
Activer la synchronisation bidirectionnelle du code source du projet vers un dépôt GitHub appartenant au compte du propriétaire du workspace.

## Important
La connexion **Git sync** s'initie depuis l'interface Lovable elle-même, pas depuis les outils de chat. L'agent ne peut pas cliquer à votre place ni déclencher l'OAuth GitHub. Ce plan liste les étapes exactes à suivre dans l'éditeur, puis les actions de vérification que l'agent peut exécuter une fois la connexion faite.

## Étapes utilisateur (à faire dans l'éditeur Lovable)

1. Ouvrir le projet **Nexora** dans l'éditeur Lovable.
2. Cliquer sur le menu **Plus (+)** situé en bas à gauche du champ de chat.
3. Sélectionner **GitHub → Connect project**.
4. Autoriser l'application **Lovable GitHub App** sur le compte GitHub souhaité.
5. Choisir le compte ou l'organisation GitHub où créer le dépôt.
6. Cliquer sur **Create Repository** dans Lovable pour générer le dépôt avec le code actuel du projet.

## Vérifications post-connexion (agent)

Une fois le dépôt créé :

1. Vérifier l'existence du fichier `.github/workflows/` dans le repo distant (si les workflows Sprint 3 doivent être préservés).
2. Confirmer que `src/routes/__root.tsx` et les routes principales sont bien poussées.
3. Vérifier que la synchronisation bidirectionnelle est active (modification test côté Lovable reflétée dans GitHub, et inversement).
4. Si nécessaire, ajouter une mémoire projet indiquant que le repo GitHub est connecté et sa branche par défaut.

## Prérequis
- Être propriétaire ou éditeur du workspace Lovable.
- Disposer des droits d'administration sur le compte/organisation GitHub cible pour autoriser l'application Lovable.

## Livrables
- Dépôt GitHub créé et synchronisé avec le projet Nexora.
- Code source du projet disponible en externe (clone, ZIP, pull requests).