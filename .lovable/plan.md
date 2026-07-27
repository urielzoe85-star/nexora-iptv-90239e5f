# Plan : Vérification et réparation de la synchronisation GitHub

## État actuel (vérifié)

- Le dépôt public GitHub indiqué reste inaccessible en ligne : `https://github.com/urielzoe85-star/nexora-iptv-90239e5f` → **404**.
- Les remotes Git locaux du projet ne contiennent **toujours aucun remote GitHub** :
  - `origin` → stockage interne Lovable (git.private.lovable-gcp.code.storage)
  - `secondary` → backup S3 Lovable
- Derniers commits locaux visibles (`git log`) : `Vérifié le lien GitHub`, `Changes`, `Aucun remote GitHub ajouté`, `Fixed crypto import in build`.

**Conclusion** : la synchronisation GitHub n'est pas encore établie. Lovable n'a pas poussé le code vers GitHub, ou le dépôt n'a pas été créé avec le nom attendu.

## Hypothèses à vérifier

1. Le dépôt a été créé mais avec un autre nom/URL.
2. L'application GitHub Lovable a été autorisée, mais la création du dépôt n'a pas été finalisée.
3. Le dépôt existe sous une organisation plutôt que sous le compte personnel.

## Étapes de résolution

1. **Confirmer l'URL exacte du dépôt** (depuis GitHub)
   - Demander à l'utilisateur de vérifier dans son compte GitHub la liste de ses dépôts récents.
   - Vérifier si le dépôt est bien nommé `nexora-iptv-90239e5f` ou s'il porte un autre nom (ex. `nexora-iptv`, `nexora-iptv-ncc`, etc.).
   - Vérifier si le dépôt se trouve sous son compte personnel `urielzoe85-star` ou sous une organisation.

2. **Vérifier le statut de l'intégration Lovable**
   - Dans l'éditeur Lovable, ouvrir le menu **Plus (+) → GitHub**.
   - Confirmer que GitHub affiche bien "Connecté" et le nom du dépôt lié.
   - Si un message d'erreur ou une étape incomplète s'affiche, la connexion doit être refaite.

3. **Relancer la synchronisation si nécessaire**
   - Si le dépôt n'existe pas ou que la connexion est incomplète : refaire **Plus (+) → GitHub → Connect project**.
   - Choisir **Create Repository** (ou reconnecter au dépôt existant si l'option est proposée).
   - Attendre que Lovable indique "Sync active".

4. **Vérifier le contenu poussé**
   - Une fois la sync active, vérifier que les fichiers suivants sont présents sur GitHub :
     - `src/routes/__root.tsx`
     - `src/routes/index.tsx`
     - `.github/workflows/sprint-3-*.yml`
     - Les derniers commits locaux mentionnés ci-dessus.

5. **Valider la synchronisation bidirectionnelle**
   - Effectuer une petite modification de test dans Lovable et vérifier qu'elle apparaît dans les commits GitHub.
   - Mettre à jour la mémoire projet avec l'URL finale du dépôt et l'état de la sync.

## Livrables

- Dépôt GitHub accessible et synchronisé avec le code Nexora.
- Confirmation visuelle que les workflows, routes et derniers commits sont présents sur GitHub.
- Mémoire projet mise à jour avec l'URL du repo et l'état de la sync.