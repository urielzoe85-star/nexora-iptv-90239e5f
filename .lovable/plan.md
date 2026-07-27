Vérification post-synchronisation GitHub et validation du site

Objectif : s'assurer que la synchronisation GitHub n'a pas introduit de régression et que le site est prêt à être publié.

````text
1. Vérifier l'état du build
   - Lancer typecheck
   - Lancer npm run build
   - S'assurer qu'il n'y a pas d'erreur liée à Vite PWA ou au boundary serveur/client

2. Vérifier le routeur et les routes principales
   - / (accueil)
   - /blog et /blog/$slug
   - /essai-gratuit /en/free-trial
   - /reseller /en/reseller
   - /ncc/* (admin)
   - S'assurer qu'il n'y a pas de conflit de route (ex. /essai vs /essai-gratuit)

3. Vérifier les fonctionnalités critiques
   - Chat IA visiteur (widget + handoff)
   - Paiement / checkout (CamerPay fallback SebPay)
   - Blog SSR + sitemap + redirects
   - IPTV Manager (imports MegaOTT, onglets par abonnement)
   - Notifications WhatsApp / Telegram / Email

4. Vérifier le SEO et les méta-données
   - S'assurer que les titres/description de la home sont en français
   - Vérifier hreflang sur les pages FR/EN
   - Vérifier que le sitemap.xml inclut les nouvelles routes

5. Optionnel : publier le site si tout est vert
   - Proposer la publication après validation réussie
````

Livrables attendus : build propre, routes principales accessibles, pas de régression sur les fonctionnalités métier, sitemap à jour. Si tu préfères qu'on attaque autre chose (ex. une nouvelle fonctionnalité, une correction de bug spécifique), dis-le-moi.