## Nouvelle page `/essai-gratuit` — Test IPTV 24h offert

La route `/essai-gratuit` renvoie une 404 : les liens SEO ajoutés récemment (hero + section pricing) pointent dans le vide. Je propose de créer une vraie landing dédiée, alignée sur le style de `/reseller`, optimisée pour la conversion et le mot-clé « essai IPTV gratuit ».

### Contenu proposé (sections)

1. **Hero** — titre « Essai IPTV gratuit 24h », sous-titre rassurant (aucune CB, activation instantanée), CTA principal « Activer mon essai » + CTA secondaire « Voir les offres ».
2. **Ce qui est inclus dans l'essai** — 4 cartes : +20 000 chaînes live, VOD 4K, multi-appareils, EPG & replay. Cadrer clairement les limites (24h, 1 appareil, qualité FHD).
3. **Comment ça marche en 3 étapes** — formulaire email/WhatsApp → réception des identifiants sous 5 min → configuration guidée sur l'appareil du client.
4. **Formulaire de demande d'essai** — champs : email, WhatsApp/Telegram (au choix), appareil cible, pays. Soumission via server function qui crée une entrée `trials` (table déjà existante `ncc.trials`) et déclenche le workflow de livraison messagerie standard (WhatsApp/email).
5. **FAQ essai gratuit** — 5–6 questions (Est-ce vraiment gratuit ? Ai-je besoin d'une CB ? Que se passe-t-il après 24h ? Puis-je tester sur Smart TV / Firestick / iOS ? Combien de temps pour recevoir mes accès ? Puis-je basculer en abonnement payant ?) + JSON-LD `FAQPage`.
6. **Preuves sociales** — bandeau réutilisant 3 témoignages existants + badges paiement + logo « Avis vérifiés ».
7. **CTA final** — rappel offre + lien contextuel vers `/reseller` (« Vous êtes revendeur ? Programme dédié ») et `/` (« Voir toutes les offres »).

### SEO & maillage

- `head()` FR : title « Essai IPTV gratuit 24h — Test sans engagement | Nexora IPTV », description ciblée « essai IPTV gratuit », `og:title` / `og:description` / `twitter:*`, `canonical` `https://nexora-iptv.com/essai-gratuit`.
- JSON-LD : `Service` + `FAQPage` + `BreadcrumbList`.
- H1 unique + H2 sémantiques (« Pourquoi tester Nexora IPTV gratuitement », « Comment activer votre essai IPTV en 3 étapes », « Questions fréquentes sur l'essai gratuit »).
- Liens internes contextuels : `/reseller`, `/blog`, `/` (offres).
- Ajout de l'URL dans `src/routes/sitemap[.]xml.ts` avec `priority=0.9`.

### Détails techniques

- Fichier : `src/routes/essai-gratuit.tsx` (route `/essai-gratuit`, structure inspirée de `src/routes/reseller.tsx`).
- Server function : `requestFreeTrial` dans `src/lib/trials.functions.ts` (public, sans auth) — insertion dans la table `trials` existante (statut `pending`), rate-limit 1 requête par email/24h, `inputValidator` Zod (email, contact channel, pays, appareil, honeypot).
- Livraison : réutilise le pipeline notifications existant (WhatsApp Cloud + email `notify.account.nexora-iptv.com`) via `notifications.actions.ts` sans nouvelle logique.
- UI : composants shadcn existants (`Card`, `Button`, `Input`, `Accordion`), palette navy/gold, aucun nouveau design system.
- Ajout entrée sitemap + ping search engines réutilisant `bumpSitemapCache`.

### Hors périmètre

- Pas de nouvelle table (on utilise `trials` déjà présente).
- Pas de modifications au provider IPTV / MegaOTT (l'activation réelle reste manuelle via NCC → `/ncc/iptv/trials` comme aujourd'hui).
- Pas de refonte du hero d'accueil ni d'autres routes.
