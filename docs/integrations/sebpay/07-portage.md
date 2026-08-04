# 7. Checklist de portage vers un autre projet

## 7.1 Étapes

1. **Secrets** — enregistrer `SEBPAY_PUBLIC_KEY` et `SEBPAY_SECRET_KEY` dans le
   gestionnaire de secrets du nouveau projet (jamais dans un fichier commité).
   Optionnel : `VITE_SEBPAY_PUBLIC_KEY` si le front en a besoin.
2. **Base de données** — ajouter à la table des commandes : `order_ref` (unique),
   `status`, `amount`, `currency`, `method`, `payment_provider`,
   `provider_reference`, `metadata` (jsonb). RLS activée, aucun accès `anon` en
   écriture. Voir `04-schema-donnees.md`.
3. **Copier les fichiers** de `05-code-portable/` :
   - `sebpay.server.ts` → couche transport ;
   - `sebpay-checkout.functions.ts` → création + verify exposé au front ;
   - `sebpay-verify.server.ts` → vérification idempotente ;
   - `sebpay-webhook.route.ts` → route `/api/public/sebpay/webhook`.
4. **Adapter les imports** : `@/lib/supabase-admin.server` (client à clé de
   service), `@/lib/rate-limit.server`, `@/automation` → remplacer par les
   équivalents du nouveau projet, ou retirer le rate-limit/l'automatisation.
5. **Checkout front** : collecter `phone`, `operator`, `country` et les stocker
   dans `metadata.momo`, puis appeler `initSebPayCheckout`.
   - `providerLink` non nul → `window.location.assign(providerLink)` ;
   - `providerLink` nul → écran d'attente + polling `verifyPayment` (5–10 s).
6. **Page de retour** (`/payment/success?ref=…`) : appeler `verifyPayment` au
   montage puis afficher le statut. Ne jamais conclure au succès sur la seule
   base des paramètres d'URL.
7. **Cron de réconciliation** (recommandé) : toutes les 5–15 min, appeler
   `verifyPaymentInternal` sur les commandes `processing` de plus de 2 minutes.
   C'est le filet de sécurité si un webhook est perdu.
8. **Tester** avec les clés `pk_test_`/`sk_test_` en rejouant les scénarios de
   `06-securite-et-tests.md` avant de passer en `live`.

## 7.2 Si la stack n'est pas TanStack Start

La logique est identique ; seules les enveloppes changent.

### Next.js (App Router)

```ts
// app/api/public/sebpay/webhook/route.ts
export async function POST(request: Request) {
  const raw = await request.text();        // corps brut, obligatoire
  // ... même séquence : signature → parse → verifyPaymentInternal → 200
  return Response.json({ ok: true });
}
```

`initSebPayCheckout` devient une Server Action ou une route `POST`.

### Express / Fastify

Le corps brut est le piège principal : désactiver le parsing JSON sur cette route.

```ts
app.post(
  "/api/public/sebpay/webhook",
  express.raw({ type: "*/*" }),          // ← indispensable
  async (req, res) => {
    const raw = req.body.toString("utf8");
    // ... même séquence
    res.json({ ok: true });
  },
);
```

### Supabase Edge Function / Deno

`sebpay.server.ts` fonctionne tel quel en remplaçant `process.env.X` par
`Deno.env.get("X")`. Web Crypto est disponible nativement.

### Cloudflare Worker / edge

Fonctionne tel quel. **Ne pas** utiliser `node:crypto` (`createHmac`) : rester sur
Web Crypto (`crypto.subtle`), sinon le build échoue avec
`"createHmac" is not exported by "__vite-browser-external"`.

## 7.3 Points à adapter

| Point | À décider dans le nouveau projet |
| --- | --- |
| Devises / pays | vérifier ce qui est activé sur le compte marchand SebPay |
| Opérateurs | compléter `operatorSlug` si de nouveaux opérateurs sont proposés |
| Multi-fournisseurs | ce projet route par pays (Cameroun → autre passerelle, Afrique de l'Ouest → SebPay) avec repli automatique sur SebPay. À simplifier si SebPay est le seul fournisseur : garder tout de même `payment_provider` en base |
| `sebpay_reference` | colonne héritée : ne pas la recréer, `provider_reference` suffit |
| Livraison post-paiement | remplacer `emitBusinessEvent` par le déclencheur du nouveau projet, en conservant l'idempotence par `order_ref` |
| Table de logs d'intégration | optionnelle mais fortement recommandée pour l'audit |

## 7.4 Erreurs déjà rencontrées et leur cause

| Symptôme | Cause réelle |
| --- | --- |
| 401 SebPay inexpliqué | clé publique `live` + clé secrète `test` (ou l'inverse) |
| 401 SebPay inexpliqué | guillemets ou espaces autour de la valeur dans l'env |
| Signature de webhook toujours invalide | corps re-sérialisé (`JSON.stringify`) au lieu du corps brut, ou parser JSON du framework actif sur la route |
| Commande bloquée en `pending` | `transaction_id` non stocké → verify impossible |
| Commande bloquée en `processing` | webhook perdu et pas de cron de réconciliation |
| Build cassé (`__vite-browser-external`) | `node:crypto` accessible depuis le graphe client |
| Double livraison | garde `.in("status", [...])` absente sur l'`UPDATE` |
| Tempête de rejeu SebPay | webhook répondant en 5xx au lieu d'ACK 200 |