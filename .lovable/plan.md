## Diagnostic

Depuis la preview Lovable (et tout iframe cross-site), le clic « Déverrouiller » ne débloque jamais l'accès à `/ncc` : le layout `/ncc` reste bloqué en spinner puis renvoie vers `/admin`.

Cause : `verifyNccAccess` pose le cookie `ncc_gate` via `setCookie(...)` avec `sameSite: "lax"`. Le NCC est chargé dans l'iframe de prévisualisation Lovable (contexte tiers). Les navigateurs modernes (Chrome/Safari/Firefox) refusent de stocker un cookie `SameSite=Lax` dans un iframe cross-site. Résultat : `getNccUnlockStatus` ne voit jamais le cookie → `unlocked = false` → redirect boucle vers `/admin`.

Le portail client a déjà rencontré ce même problème et le résout avec `SameSite=None; Secure; Partitioned` (voir `src/lib/portal.server.ts` → `buildSessionCookie`). Le cookie NCC doit adopter la même stratégie.

## Correctif

**`src/lib/ncc-gate.server.ts`** — remplacer l'usage de `setCookie` / `deleteCookie` par un `Set-Cookie` construit manuellement (comme le portail), avec attributs :
- `HttpOnly`
- `Secure`
- `SameSite=None`
- `Partitioned`
- `Path=/`
- `Max-Age=<ttl>` (ou `0` pour l'effacement)

Utiliser `setResponseHeader('set-cookie', ...)` de `@tanstack/react-start/server` pour l'émission, et laisser `readNccGateCookie` inchangé (getCookie continue de lire tout cookie posé sous ce nom).

Aucun autre fichier n'a besoin de changer : le layout `/ncc` conserve son retry de 250 ms, et le domaine production (nexora-iptv.com / .lovable.app) accepte aussi `SameSite=None; Partitioned` sans régression puisque le cookie reste HttpOnly + Secure.

## Vérification post-fix

1. En preview, cliquer « Accéder au NCC » → saisir mot de passe → `/ncc` s'ouvre sans redirection.
2. En production (`nexora-iptv.lovable.app`), même flux → OK.
3. Après 8h, `verifyNccToken` expire → redirect vers `/admin` comme prévu.
