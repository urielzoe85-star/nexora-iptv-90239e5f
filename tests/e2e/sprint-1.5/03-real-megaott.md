# Scénario 3 — Run réel MEGAOTT (checklist manuelle, 1× par release)

But : valider que la chaîne complète fonctionne contre le vrai panel MEGAOTT.
À ne PAS automatiser (consomme crédit + trace côté fournisseur).

## Pré-vol

- [ ] `MEGAOTT_BEARER_TOKEN` présent en secrets Cloud (Settings → Secrets).
- [ ] `iptv_providers` : au moins 1 ligne avec `metadata->>kind = 'megaott'`
      et `status = 'active'`.
- [ ] `AUTOMATION_CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
      `SEBPAY_SECRET_KEY` disponibles côté testeur.

## Étapes

1. **Seed** un order test via `helpers/db.py` :
   ```bash
   python3 - <<'PY'
   from tests.e2e.sprint15.helpers.db import SupaAdmin
   import time
   ref = f"NXR-E2E-REAL-{int(time.time())}"
   SupaAdmin().seed_customer_and_order(ref, with_sebpay_ref=False)
   print(ref)
   PY
   ```
2. **Émettre** `payment.confirmed` (sans désactiver MEGAOTT cette fois) :
   ```bash
   REF=NXR-E2E-REAL-...
   curl -X POST "$E2E_BASE_URL/api/public/automation/emit-test" \
     -H "Authorization: Bearer $AUTOMATION_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d "{\"event\":\"payment.confirmed\",\"orderRef\":\"$REF\",\"payload\":{\"planName\":\"E2E\",\"amount\":1,\"currency\":\"EUR\"}}"
   ```
3. **Drainer** la queue (jusqu'à 5 fois si besoin) :
   ```bash
   curl -X POST "$E2E_BASE_URL/api/public/automation/process-queue" \
     -H "Authorization: Bearer $AUTOMATION_CRON_SECRET" -d '{}'
   ```
4. **Vérifications** :
   - [ ] NCC → Commandes → chercher `NXR-E2E-REAL-*` : la carte IPTV
         montre username/password/DNS renvoyés par MEGAOTT.
   - [ ] Panel MEGAOTT : l'utilisateur existe (chercher par username).
   - [ ] `iptv_accounts` : ligne avec `metadata.remote_user_id` non nul et
         `status = 'active'`.
   - [ ] `automation_runs.status = 'completed'` pour ce ref.
5. **Cleanup** (obligatoire) :
   - Supprimer l'utilisateur côté panel MEGAOTT.
   - `python3 tests/e2e/sprint-1.5/helpers/cleanup.py` (purge tout
     `NXR-E2E-*` en base).

## Rollback

Si l'étape 2 renvoie 500 / le drain fait un run failed :
- Consulter `automation_steps.error` pour la dernière étape → le message
  inclut le status upstream + snippet du body renvoyé par MEGAOTT.
- Ne pas retenter en boucle sans cleanup — chaque succès crée un
  utilisateur MEGAOTT réel.