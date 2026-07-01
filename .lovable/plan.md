
# Sprint 1.5 — E2E chemin critique (Playwright)

Objectif : prouver que le chemin **checkout → paiement → workflow → livraison → /track** fonctionne bout-en-bout, sans consommer de crédit MEGAOTT sur chaque run.

## Contraintes techniques (constatées à l'audit)

- SebPay n'a pas de sandbox : on ne peut pas dérouler un vrai `verifyPayment` en test.
- Le connecteur MEGAOTT bascule automatiquement en mode "local" (aucun appel distant, `iptv_accounts.status='available'`) quand `isReady()` est faux — c'est le mock naturel de l'adapter.
- Le webhook `/api/public/sebpay/webhook` fait de la vérification HMAC + rappelle SebPay (défense en profondeur). On peut tester la HMAC sans SebPay, mais pas la transition `pending → paid` sans mock upstream.

## Architecture de la suite

Dossier `tests/e2e/sprint-1.5/` :

```
tests/e2e/sprint-1.5/
  README.md              # comment lancer chaque scénario
  helpers/
    db.ts                # client Supabase admin (lit .env), seed & cleanup
    signing.ts           # HMAC SebPay pour forger un webhook signé
    fixtures.ts          # payloads type (order, customer, sebpay body)
  01-happy-path.spec.ts  # scénario nominal, MEGAOTT mocké (isReady=false)
  02-webhook-replay.spec.ts # même webhook 2x → 1 seul compte, 1 seul email
  03-real-megaott.md     # runbook manuel (1 run réel documenté)
```

Lancé via `bunx playwright test tests/e2e/sprint-1.5` en ciblant `http://localhost:8080` (dev server déjà up).

## Scénario 1 — Happy path (nominal, mocké)

1. **Seed DB** (helpers/db.ts, service role) :
   - désactive temporairement le provider MEGAOTT (`UPDATE iptv_providers SET metadata = metadata || '{"kind":"disabled"}' WHERE metadata->>'kind'='megaott'` puis restore en teardown) — force `isReady()=false`, donc mode simulé côté adapter.
   - crée `customers` + `orders` (status=pending, order_ref=`NXR-E2E-${ts}`, sebpay_reference=null pour skip re-verify).
2. **Émettre `payment.confirmed`** directement (bypass SebPay upstream) : POST vers un mini endpoint de test `/api/public/automation/emit-test` protégé par `AUTOMATION_CRON_SECRET`. → à créer, ~20 lignes, refuse tout ref qui ne commence pas par `NXR-E2E-`.
3. **Drainer la queue** : POST `/api/public/automation/process-queue` avec `Authorization: Bearer $AUTOMATION_CRON_SECRET`, en boucle (max 5 itérations) jusqu'à ce que la queue soit vide.
4. **Assertions DB** :
   - `iptv_accounts` : 1 ligne pour `metadata->>order_ref = NXR-E2E-*`
   - `automation_runs` : 1 run `completed` pour `payment-confirmed`
   - `delivery_logs` : au moins 1 entrée
   - `orders.metadata.iptv_delivery` : présent avec `delivery_status ∈ {ready_to_send, sent}`
5. **UI /track** : Playwright ouvre `/track?ref=NXR-E2E-...`, vérifie badge "Livraison affectée" + screenshot.
6. **Teardown** : delete tout ce qui commence par `NXR-E2E-`, restore provider MEGAOTT.

## Scénario 2 — Webhook rejoué

Même seed que scenario 1 mais on garde `sebpay_reference` set pour tester le chemin webhook.

1. Forger le body SebPay + signer avec `SEBPAY_SECRET_KEY` (via `crypto.createHmac`).
2. POST `/api/public/sebpay/webhook` avec `X-SebPay-Signature` valide → attendu `200 {ok:true}`. Le webhook va tenter `verifyPaymentInternal` qui appellera SebPay upstream et échouera silencieusement → l'ordre reste `pending`, mais l'entrée `integration_debug_logs` est créée. On assert :
   - 1 ligne `integration_debug_logs` (signature_valid=true, HTTP 200)
3. POST **le même** body/signature une 2ème fois. Assert :
   - 2 lignes `integration_debug_logs` (les receipts)
   - **toujours 0** `automation_queue` / `iptv_accounts` (car verify n'a pas transitionné)
4. Test complémentaire : POST avec signature volontairement fausse → `401`, 1 ligne log avec `signature_valid=false`. Prouve la protection.

Note : le test d'idempotence "2 webhooks paid → 1 seul compte" est déjà couvert au niveau code par l'index unique `automation_queue.idempotency_key` (`payment.confirmed:${order_ref}`) et par le guard "compte existant" dans `createIptvSubscription`. On le prouve indirectement en scénario 1 en émettant 2x l'event et en vérifiant `count(iptv_accounts) = 1`.

## Scénario 3 — Run réel MEGAOTT (manuel, documenté)

Fichier `03-real-megaott.md` : checklist step-by-step, à jouer 1 fois par release :

1. Vérifier `MEGAOTT_BEARER_TOKEN` en secrets + provider `metadata.kind=megaott` actif.
2. Créer une vraie commande via l'UI checkout (montant 1 EUR sur plan test).
3. Rejouer la même séquence que scénario 1 (émission event via l'endpoint test).
4. Vérifier dans le panel MEGAOTT que l'utilisateur existe, que l'email est reçu.
5. Cleanup : supprimer l'utilisateur MEGAOTT + l'ordre.

## Changements code

- **Nouveau** `src/routes/api/public/automation/emit-test.ts` (~40 lignes) : POST, protégé par `AUTOMATION_CRON_SECRET` + guard `ref` doit matcher `/^NXR-E2E-/`. Émet un event automation arbitraire. Utilité : contourner SebPay upstream en test sans polluer `verifyPaymentInternal`.
- **Nouveau** `tests/e2e/sprint-1.5/*` (les 3 specs + helpers).
- **Nouveau** `.lovable/sprint-1.5-report.md` : template pour reporter les résultats après chaque run.
- **Mise à jour** `.lovable/plan.md` : cocher Sprint 1.5 quand tout est vert.

Aucune modification des fichiers de production hors le nouvel endpoint test (guardé et inoffensif : refuse tout ref non-préfixé).

## Livrable

- Suite Playwright verte (scénarios 1 & 2) reproductible via `bunx playwright test tests/e2e/sprint-1.5`.
- Screenshots `/track` avant/après livraison.
- Rapport avec les rows insérées (iptv_accounts.id, delivery_logs.id, automation_runs.id) pour audit.

---

**Ordre d'exécution proposé** : (1) endpoint test + helpers → (2) scenario 1 vert → (3) scenario 2 vert → (4) doc manuelle → (5) mettre à jour plan.md et te rendre le rapport.

Tu valides ?
