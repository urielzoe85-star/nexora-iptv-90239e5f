## Objectif
Ajouter dans **NCC → Envoi en masse** un nouveau scénario **Marketing / Promotion commerciale** avec des templates pré-rédigés, et permettre à l'admin de **rédiger son propre message** (sujet + corps) au lieu de choisir un template figé.

## Portée
Frontend + templates uniquement. Aucune modification de l'infra d'envoi (WhatsApp/Telegram/Email), de la queue email, ni des tables. On garde le throttle et la trace `delivery_logs` existants.

## Changements

### 1. Nouveau scénario `marketing`
- `src/domain/delivery/builtin-templates.ts` :
  - Étendre `BulkScenario` → `"delivery" | "renewal" | "payment_reminder" | "marketing"`.
  - Ajouter 4–5 `BULK_TEMPLATES` marketing FR/EN (offre découverte, promo saisonnière, nouveauté catalogue, réactivation ex-client, upsell VIP) avec variables sûres : `{{client_name}}`, `{{product_name}}`, `{{portal_link}}`, `{{renew_url}}`.

### 2. Rédaction libre (« Scénario personnalisé »)
- `src/components/ncc/bulk/BulkSendPage.tsx` :
  - Ajouter option `custom` dans le sélecteur Scénario (label « ✍️ Message personnalisé »).
  - Quand `scenario === "custom"` : masquer le sélecteur Template et afficher deux champs :
    - `Input` **Sujet** (utilisé pour l'email).
    - `Textarea` **Message** (multi-ligne, min 10 caractères).
  - Petit helper affichant les variables disponibles cliquables pour insertion (`{{client_name}}`, `{{product_name}}`, `{{portal_link}}`, `{{renew_url}}`, `{{expiration_date}}`, `{{username}}`).
  - La preview utilise le message rédigé (rendu via `renderTemplate` existant).
  - Envoi : construire un template éphémère `{ id: "custom", subject, body }` et l'envoyer au backend.

### 3. Backend — accepter un template ad hoc
- `src/lib/bulk-send.functions.ts` :
  - `ScenarioEnum` inclut `"marketing"` et `"custom"`.
  - `bulkSendMessages` : si `template_id === "custom"`, lire `custom_subject` + `custom_body` (nouveaux champs optionnels validés par Zod, max 200 / 4000 caractères) au lieu d'appeler `getBulkTemplate`. Sinon comportement inchangé.
  - `listBulkTargets` pour scénario `marketing` : utiliser la même requête que `delivery` mais élargir à tous les clients ayant au moins une commande sur la fenêtre (statuts `completed`, `paid`, `active`) — pour cibler la base client existante.

## Hors périmètre
- Pas de sauvegarde des scénarios personnalisés (one-shot). Pourra être ajouté plus tard si besoin.
- Pas de segmentation avancée (tags, LTV) — le CSV import reste la solution pour cibles custom.
- Pas de garde-fous anti-spam supplémentaires côté infra (le throttle 200 ms + suppressions email existants restent en place).

## Fichiers touchés
- `src/domain/delivery/builtin-templates.ts`
- `src/lib/bulk-send.functions.ts`
- `src/components/ncc/bulk/BulkSendPage.tsx`
