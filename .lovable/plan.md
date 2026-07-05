## Objectif

Fournir une URL de callback stable pour que Meta / WhatsApp Business API (WABA) puisse configurer un webhook vers Nexora IPTV, avec la vérification GET (`hub.challenge`) et la réception POST signée (`X-Hub-Signature-256`) exigées par Meta.

## URL de callback à fournir à WABA

```
https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/whatsapp/webhook
```

(URL stable, immuable même si le projet est renommé. Le domaine `nexora-iptv.com` pourra aussi être utilisé une fois le custom domain rattaché : `https://nexora-iptv.com/api/public/whatsapp/webhook`.)

- **Verify Token** à saisir côté Meta : valeur libre que tu choisis, stockée en secret projet `WHATSAPP_VERIFY_TOKEN`.
- **App Secret** de l'app Meta : stocké en secret projet `WHATSAPP_APP_SECRET` (sert à valider `X-Hub-Signature-256`).

## Implémentation

### 1. Secrets à ajouter (via `add_secret`)
- `WHATSAPP_VERIFY_TOKEN` — chaîne aléatoire, à recopier dans le champ "Verify token" côté Meta.
- `WHATSAPP_APP_SECRET` — App Secret de l'application Meta (Settings → Basic).

### 2. Nouvelle route publique `src/routes/api/public/whatsapp/webhook.ts`

Deux handlers, conformes à la spec Meta Cloud API :

- **GET** — handshake de vérification :
  - Lit `hub.mode`, `hub.verify_token`, `hub.challenge` en query.
  - Si `hub.mode === "subscribe"` et `hub.verify_token === WHATSAPP_VERIFY_TOKEN` → renvoie `hub.challenge` en `text/plain` 200.
  - Sinon → 403.

- **POST** — réception d'événements :
  - Lit le body brut (`request.text()`).
  - Recalcule `sha256=HMAC(WHATSAPP_APP_SECRET, rawBody)` et compare en temps constant à l'en-tête `X-Hub-Signature-256`. Rejet 401 si mismatch.
  - Parse le JSON, log l'update (message entrant, statut de livraison), et renvoie **toujours 200** rapidement (Meta réessaie sinon).
  - Traitement métier minimal pour ce premier jet : journalisation via `logger` du hub d'intégration + insertion best-effort dans une future table `whatsapp_events` (non créée dans ce plan — juste log pour l'instant).

### 3. Détails techniques
- Route sous `/api/public/*` → bypass de l'auth de site publié (obligatoire pour webhooks externes).
- `createFileRoute` avec `server.handlers.{GET, POST}` (pas d'export nommé).
- HMAC via `node:crypto` (`createHmac`, `timingSafeEqual`), même pattern que la route Telegram existante et `src/integration-hub/webhooks/signatures.ts`.
- Réponse POST : `Response.json({ ok: true })` même en cas d'erreur applicative interne (on log, mais on 200 pour éviter les retries agressifs Meta). Seule la signature invalide renvoie 401.
- Aucun changement UI, aucune migration, aucun secret exposé dans le code.

## Ce que tu fais côté Meta

1. Meta for Developers → ton app WhatsApp → **Configuration → Webhooks**.
2. Callback URL : `https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/api/public/whatsapp/webhook`
3. Verify token : la valeur que tu m'as demandé de stocker dans `WHATSAPP_VERIFY_TOKEN`.
4. Souscrire aux champs `messages` (et `message_template_status_update` si besoin).

## Hors périmètre (à faire dans un plan ultérieur si souhaité)
- Envoi sortant de messages WhatsApp via l'API Cloud (templates, sessions 24h).
- Table `whatsapp_events` + UI d'inspection dans NCC.
- Rattachement `chat_id WhatsApp` au customer (équivalent du `/start` Telegram).
