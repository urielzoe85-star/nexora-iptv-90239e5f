# Plan d'audit global Nexora IPTV

## Objectif
Vérifier que les modifications récentes (désactivation temporaire de la PWA, correctif Capacitor, garde native) n'ont pas dégradé les fonctionnalités métier critiques : site web, checkout, paiements, emails, WhatsApp, Telegram, blog, SEO, espace client et sécurité.

## Périmètre
- **Build & runtime** : typecheck, lint, build production, bundle.
- **PWA / Capacitor** : état de la couche PWA, comportement natif, absence de fuite vers Chrome.
- **Site web** : homepage, routes marketing, catalogue, galerie, blog, pages légales, SEO.
- **Espace client** : authentification, portail, commandes, téléchargements.
- **Communications** : email (Lovable Emails), WhatsApp (wa.me), Telegram, AI chat.
- **Paiements** : checkout, SebPay, CamerPay, Binance Pay, cartes/PayPal.
- **Admin NCC** : dashboard, IPTV Manager, bulk messaging, blog CMS, AI Center.
- **Sécurité** : headers, CSP, RLS, politiques Realtime, secrets.

## Méthodologie
1. **Tests statiques & build** : `bun run build`, `tsgo`, `eslint`.
2. **Inspection de code** : vérifier les fichiers modifiés et leurs dépendances.
3. **Tests en preview** : Playwright sur les parcours critiques (homepage → checkout → confirmation, blog, espace client).
4. **Vérifications backend** : état des tables, queues email, RLS, policies Realtime.
5. **Tests de communication** : envoi de test email, Telegram, WhatsApp via NCC.
6. **Rapport** : liste des problèmes trouvés, sévérité, actions correctives proposées.

## Phases détaillées

### Phase 1 — Build & architecture (≈ 15 min)
- Vérifier `vite.config.ts` : plugin `VitePWA` correctement commenté, `mcpPlugin` présent.
- Vérifier `src/pwa/config.ts`, `src/pwa/register.ts`, `src/components/pwa/PwaManager.tsx` : `PWA_ENABLED = false` proprement géré, nettoyage des SW/caches, pas d'appel `installEvt.prompt()` en mode natif.
- Vérifier `capacitor.config.ts` et `capacitor.config.json` : `server.url` sur `nexora-iptv.com`, `allowNavigation` incluant `*.nexora-iptv.com`.
- Vérifier `src/components/native/NativeNavigationGuard.tsx` : interception `window.open` et liens `NEXORA_HOSTS`, blocage des ouvertures automatiques.
- Lancer `bun run build` et `tsgo` pour s'assurer qu'aucune erreur n'est introduite.

### Phase 2 — PWA / Capacitor (≈ 10 min)
- Confirmer que `<link rel="manifest">` n'est plus injecté dans `src/routes/__root.tsx`.
- Confirmer que `beforeinstallprompt` est neutralisé en amont (capture phase + `stopImmediatePropagation`).
- Confirmer que `navigator.serviceWorker.register` est override dans le script inline.
- Vérifier que `PwaManager` retourne `null` quand `PWA_ENABLED` est `false` ou en mode natif.
- Vérifier que le site reste responsive et fonctionnel sans SW.

### Phase 3 — Site web & SEO (≈ 20 min)
- Homepage : chargement, navigation, sections (hero, devices, pricing, testimonials, FAQ, blog, payments, support).
- Vérifier les liens internes (`/essai-gratuit`, `/reseller`, `/catalog`, `/galerie`, `/blog`, `/guide-iptv`).
- Vérifier les balises SEO : title, description, canonical, og:image, hreflang, JSON-LD.
- Blog : liste des articles, page article, RSS, sitemap, redirections 301.
- Vérifier que les pages ne retournent pas de 404 inattendues.

### Phase 4 — Espace client & auth (≈ 15 min)
- Vérifier `src/lib/portal-url.ts` et `src/start.ts` : middleware `accountSubdomainMiddleware` redirige correctement `account.nexora-iptv.com/` vers `/espace-client` et renvoie les routes marketing vers `www.nexora-iptv.com`.
- Vérifier que les routes `/auth/*`, `/checkout`, `/api/*`, `/lovable/*` sont autorisées sur le sous-domaine `account`.
- Tester la connexion / inscription (OTP/mot de passe) si possible.
- Vérifier les pages de téléchargement (M-IBO Player, etc.).

### Phase 5 — Communications (≈ 20 min)
- **Email** : vérifier `email_domain--check_email_domain_status`, l'état des queues `auth_emails` / `transactional_emails`, la table `email_send_log`, les templates.
- **WhatsApp** : vérifier `src/lib/whatsapp-contact.ts` (numéro, format `wa.me`), les liens dans la homepage et le checkout.
- **Telegram** : vérifier le lien `https://t.me/NexoraIPTVBot` et les envois via NCC/services admin.
- **AI chat** : vérifier que les threads/messages sont isolés par session (pas d'exposition cross-visitor), multi-langue, et que le mode natif ne le casse pas.
- Tester un envoi de chaque canal si le backend est sain.

### Phase 6 — Paiements (≈ 20 min)
- Vérifier `src/routes/checkout.tsx` : création de commande, `initCheckout`, redirection `window.location.assign` vers provider.
- Vérifier les workflows `payment-confirmed`, `payment-failed`, `order-created`.
- Vérifier que les provider-links SebPay / CamerPay / Binance Pay sont générés.
- Vérifier les webhooks et les routes de confirmation (`/payment/success`, `/payment/failed`).
- Vérifier que le fallback CamerPay → SebPay est toujours actif.

### Phase 7 — Sécurité (≈ 15 min)
- Vérifier les headers dans `src/start.ts` : CSP, HSTS, X-Frame-Options, Permissions-Policy.
- Vérifier que CSP est en `Report-Only` (sauf si `CSP_ENFORCE=1`).
- Vérifier RLS sur les tables publiques (plans, blog, galerie, commandes, chat).
- Vérifier les policies Realtime sur `ai_chat_threads` et `ai_chat_messages`.
- Vérifier que les anciens findings corrigés ne sont pas réapparus.

### Phase 8 — Tests E2E / Smoke (≈ 25 min)
- Exécuter un parcours Playwright : homepage → choix d'un plan → checkout → paiement mocké → confirmation.
- Exécuter un parcours blog : publication admin → apparition sur `/blog` → clic article → contenu affiché.
- Exécuter un parcours espace client : connexion → commandes → téléchargement.
- Vérifier les logs console et réseau pendant les tests.
- Vérifier que la garde native ne bloque pas les clics utilisateur légitimes.

## Livrables
- **Rapport d'audit** listant chaque zone, son statut (OK / Attention / Critique) et les preuves.
- **Liste des bugs/régressions** classés par sévérité, avec le fichier/ligne concerné.
- **Plan de correction** si des problèmes sont trouvés.
- **Go/No-go** pour la réactivation éventuelle de la PWA ou le rebuild de l'APK.

## Critères de succès
- Build passe sans erreur ni warning critique.
- Aucune régression sur homepage, checkout, blog, espace client.
- Emails, WhatsApp, Telegram restent fonctionnels.
- Paiements génèrent correctement les liens providers.
- Aucune ouverture automatique de Chrome en mode natif simulé.
- Aucun nouveau finding de sécurité critique.

## Estimation
Environ **2 à 3 heures** selon le nombre de problèmes détectés.

## Prochaine étape après validation
Si l'audit révèle des problèmes : je corrige d'abord ceux de sévérité critique, puis moyenne, puis faible, avant tout rebuild APK ou réactivation PWA.
