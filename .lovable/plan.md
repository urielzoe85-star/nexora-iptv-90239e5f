# Espace Client — Login par mot de passe (en plus de l'OTP)

Objectif : permettre au client de **créer un compte avec email + mot de passe** et de se connecter avec, tout en gardant le code par e-mail (OTP) comme méthode alternative.

## Ce qui change côté client (UI)

Sur `account.nexora-iptv.com/espace-client` (page de connexion), 3 onglets :

1. **Connexion** — email + mot de passe → bouton "Se connecter"
2. **Créer un compte** — email + mot de passe + confirmation → "Créer mon compte"
3. **Code par e-mail** — flux OTP existant (inchangé)

Ajouts UX :
- Lien "Mot de passe oublié ?" sous le formulaire de connexion → envoie un lien de réinitialisation (jeton unique par e-mail, valable 30 min).
- Page `/espace-client/reset-password?token=…` pour définir un nouveau mot de passe.
- Dans `/espace-client/profile`, section "Sécurité" : définir / changer le mot de passe.

Après connexion réussie (peu importe la méthode) → même cookie de session existant (`nx_portal_session`) → redirection vers `/espace-client/dashboard`. Rien à changer sur les autres pages.

## Ce qui change côté base de données

Une migration Lovable Cloud ajoute :

- **`customers.password_hash TEXT NULL`** — mot de passe scrypt (jamais en clair, jamais renvoyé au client).
- **`customers.password_updated_at TIMESTAMPTZ NULL`**.
- **Table `client_portal_password_resets`** : `id, customer_id, token_hash, expires_at, used_at, created_at, ip`.
- Rate-limit sur les tentatives de connexion : réutilise la logique existante (`client_portal_otps` pour l'OTP) ; pour le mot de passe, compteur simple par e-mail dans une nouvelle table légère `client_portal_login_attempts` (5 tentatives / 15 min).

Aucune politique publique n'est ajoutée : tout est lu/écrit via `supabaseAdmin` dans les server functions, comme le flux OTP actuel.

## Ce qui change côté serveur (`src/lib/portal.functions.ts` + `portal.server.ts`)

Nouvelles server functions :

- `registerPortalAccount({ email, password })` — vérifie que l'e-mail existe dans `customers` (sinon message générique "vérifiez votre e-mail ou contactez le support"), refuse si un mot de passe est déjà défini, hache et enregistre, ouvre la session, pose le cookie.
- `loginPortalPassword({ email, password })` — vérifie le hash, respecte le rate-limit, ouvre la session.
- `requestPortalPasswordReset({ email })` — génère un jeton, envoie l'e-mail via `delivery_logs` + Telegram admin (comme l'OTP), réponse générique.
- `resetPortalPassword({ token, password })` — consomme le jeton, met à jour le hash, ouvre la session.
- `changePortalPassword({ currentPassword, newPassword })` — pour utilisateur déjà connecté (page Profil).

Sécurité **moyenne** demandée :
- Hash : **scrypt** de `node:crypto` (déjà dispo côté Worker), paramètres N=16384, r=8, p=1, sel 16 octets.
- Longueur minimum : **8 caractères**, au moins 1 lettre + 1 chiffre. Pas de contrainte plus lourde.
- Comparaisons en `timingSafeEqual`.
- Cookie de session, expiration, révocation : identiques au flux OTP existant → aucun changement.

## Fichiers touchés

- `src/lib/portal.server.ts` : helpers `hashPassword`, `verifyPassword`, `generateResetToken`, `sendPasswordResetEmail`.
- `src/lib/portal.functions.ts` : 5 nouvelles server functions listées ci-dessus.
- `src/routes/espace-client.index.tsx` : refonte en 3 onglets (Connexion / Créer / Code e-mail).
- `src/routes/espace-client.reset-password.tsx` : **nouvelle** route publique pour poser un nouveau mot de passe depuis le lien e-mail.
- `src/routes/espace-client.profile.tsx` : ajout bloc "Sécurité — mot de passe".
- 1 migration SQL pour les colonnes + tables ci-dessus.

## Détails techniques

- Aucun changement sur Supabase Auth (`auth.users`) : l'Espace Client reste un système parallèle basé sur `customers` + cookie, comme aujourd'hui. On ne mélange pas les deux.
- `password_hash` stocké au format `scrypt$N$r$p$saltHex$hashHex` (auto-décrit, permet de tuner les paramètres plus tard).
- Le lien de réinitialisation pointe vers `https://account.nexora-iptv.com/espace-client/reset-password?token=…`.
- Les e-mails (création, reset) passent par le même canal `delivery_logs` que l'OTP actuel, avec templates simples en français.
- Le rate-limit login : 5 échecs consécutifs bloquent 15 min, réponse générique "Identifiants invalides".
