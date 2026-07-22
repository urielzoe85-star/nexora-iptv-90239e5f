# Diagnostic — app.nexora-iptv.com

## Cause exacte

Ce n'est **ni un bug de code, ni un problème de build**. C'est un problème **d'attachement de domaine côté Lovable**.

Ce que j'ai observé en live :

| Vérification | Résultat |
|---|---|
| DNS `app.nexora-iptv.com` | `CNAME → nexora-iptv.com` → `A 185.158.133.1` (IP Lovable). **DNS OK.** |
| HTTP `http://app.nexora-iptv.com` | **`HTTP/1.1 409 Conflict`** servi par `Server: cloudflare` |
| HTTPS `https://app.nexora-iptv.com` | **`TLS handshake failure (552)`** — aucun certificat n'est présenté |

Traduction : le DNS pointe correctement vers l'edge Lovable/Cloudflare, mais l'edge **ne reconnaît pas** `app.nexora-iptv.com` comme un domaine attaché à un projet. Résultat :
- Pas de certificat SSL émis pour ce hostname → handshake TLS échoue → « site inaccessible » en HTTPS.
- En HTTP, l'edge renvoie **409 Conflict** (domaine non revendiqué).

Les domaines déjà connectés au projet sont `nexora-iptv.com`, `www.nexora-iptv.com`, `account.nexora-iptv.com`. `app.nexora-iptv.com` n'y figure pas encore — c'est pour ça que le code App Store Mode (qui se déclenche sur ce hostname) n'a jamais été atteint : Cloudflare bloque avant que la requête n'arrive à l'app.

Ce n'est donc :
- ❌ pas un 404 route TanStack
- ❌ pas un 502 origine down
- ❌ pas un problème de build
- ❌ pas un problème de vhost côté app
- ✅ un **domaine non attaché** → **pas de certificat** → TLS handshake failure

## Correctif (action manuelle requise dans l'UI Lovable)

Je ne peux pas attacher un domaine depuis le code — cela se fait dans les paramètres du projet.

1. Ouvrir **Project Settings → Project → Domains**.
2. Cliquer **Connect Domain**, saisir `app.nexora-iptv.com`.
3. Le DNS existant (`A 185.158.133.1`) est déjà correct — la vérification devrait passer immédiatement.
4. Attendre le passage `Verifying → Setting up → Active` (émission SSL Let's Encrypt, quelques minutes).

Une fois `Active` :
- HTTPS répondra avec un certificat valide.
- La requête atteindra l'app, `AppStoreGate` détectera le hostname `app.nexora-iptv.com` et activera automatiquement le mode neutralisé (déjà codé, testé, audit PASS).

## Vérification après attachement

Je relancerai :
```bash
curl -I https://app.nexora-iptv.com
```
Attendu : `HTTP/2 200`, `content-type: text/html`, et titre `Nexora` (mode neutre). Si ce n'est pas le cas dans les 15 min après passage `Active`, je regarderai les logs SSR pour confirmer que le middleware account/portal ne redirige pas ce hostname par erreur.

## Rien à changer dans le code pour l'instant

Le code App Store Mode est prêt et audit PASS. Il faut juste que la requête arrive jusqu'à l'app — ce qui nécessite l'attachement du domaine.
