# Plan : vérification et activation Git sync GitHub pour Nexora

## État actuel (vérifié)
La synchronisation GitHub n'est **pas encore établie**. Les remotes Git configurés dans le projet pointent uniquement vers :
- `origin` : stockage interne Lovable (`git.private.lovable-gcp.code.storage`)
- `secondary` : backup S3 Lovable (`s3://lovable-repositories/...`)

Aucun remote `github.com/...` n'est présent. Le plan initial reste donc d'actualité.

## Étapes utilisateur (à réaliser dans l'éditeur Lovable)

1. Ouvrir le projet **Nexora** dans l'éditeur Lovable.
2. Cliquer sur le menu **Plus (+)** en bas à gauche du champ de chat.
3. Sélectionner **GitHub → Connect project**.
4. Autoriser l'application **Lovable GitHub App** sur le compte GitHub souhaité.
5. Choisir le compte ou l'organisation GitHub où créer le dépôt.
6. Cliquer sur **Create Repository** pour générer le dépôt avec le code actuel du projet.

## Vérifications post-connexion (agent)

Une fois le dépôt créé :

1. Vérifier l'existence du dossier `.github/workflows/` dans le repo distant (workflows Sprint 3).
2. Confirmer que `src/routes/__root.tsx` et les routes principales sont bien poussées.
3. Vérifier que la synchronisation bidirectionnelle est active (modification test côté Lovable reflétée dans GitHub, et inversement).
4. Ajouter une mémoire projet indiquant que le repo GitHub est connecté et sa branche par défaut.

## Prérequis
- Être propriétaire ou éditeur du workspace Lovable.
- Disposer des droits d'administration sur le compte/organisation GitHub cible pour autoriser l'application Lovable.

## Livrables
- Dépôt GitHub créé et synchronisé avec le projet Nexora.
- Code source du projet disponible en externe (clone, ZIP, pull requests).