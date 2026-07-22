Plan de vérification Cloudflare — redirection 302 app.nexora-iptv.com → nexora-iptv.com

Contexte confirmé
- HTTPS et certificat SSL fonctionnent pour app.nexora-iptv.com (HTTP/2 302).
- Toutes les requêtes vers app.nexora-iptv.com (racine, /robots.txt, HTTP et HTTPS) sont redirigées en 302 vers le domaine principal nexora-iptv.com.
- La réponse 302 ne contient pas le header x-deployment-id présent sur les réponses 200 de l’application. Elle provient donc de l’edge (Cloudflare ou Lovable), pas du code applicatif.

Objectif
Déterminer si la redirection peut être désactivée côté Cloudflare avant de revenir à la solution « domaine principal temporaire ».

Étapes du plan

1. Inventaire d’accès Cloudflare
   - Ouvrir le tableau de bord Cloudflare du compte qui gère nexora-iptv.com.
   - Vérifier que le domaine est bien présent et que les enregistrements DNS A pour app.nexora-iptv.com pointent vers 185.158.133.1 (IP Lovable) avec le nuage orange « Proxied » activé.

2. Vérifier les Page Rules
   - Aller dans Rules → Page Rules (ou Redirect Rules).
   - Rechercher toute règle contenant app.nexora-iptv.com ou un wildcard *.nexora-iptv.com qui forward/redirect vers nexora-iptv.com.
   - Si une règle existe, la désactiver ou la supprimer, puis attendre 30–60 secondes et retester avec curl.

3. Vérifier les Redirect Rules et Bulk Redirects
   - Aller dans Rules → Redirect Rules → Bulk Redirects.
   - Vérifier l’absence de redirection globale de sous-domaines vers le domaine principal.
   - Si une règle existe, la désactiver temporairement.

4. Vérifier les paramètres SSL/TLS
   - SSL/TLS → Overview : confirmer que le mode est « Full (strict) » ou « Full » (pas « Flexible » qui pourrait forcer des redirections).
   - SSL/TLS → Edge Certificates : vérifier que le certificat couvre *.nexora-iptv.com et nexora-iptv.com (pas seulement le root).

5. Test après chaque modification
   - curl -I -s https://app.nexora-iptv.com/
   - curl -I -s http://app.nexora-iptv.com/
   - Observer si le Location passe de https://nexora-iptv.com/ à https://app.nexora-iptv.com/.

6. Fallback si Cloudflare n’est pas la cause
   - Si aucune règle Cloudflare n’est trouvée ou si le compte n’a pas accès au domaine (gestion Lovable côté edge), la redirection est appliquée par Lovable.
   - Dans ce cas, passer au plan B : contacter le support Lovable pour demander la désactivation de la redirection de app.nexora-iptv.com, ou opter pour la solution « domaine principal temporaire » déjà évoquée.

Critères de succès
- Cloudflare est la cause : après suppression d’une règle, curl retourne HTTP/2 200 avec x-deployment-id et un contenu HTML neutralisé (App Store mode actif).
- Cloudflare n’est pas la cause : on identifie clairement que la redirection est Lovable-native et on enchaîne sur le plan de contournement.