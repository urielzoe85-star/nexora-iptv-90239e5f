## Problème
Sur la home, la carte "Android" de la section Téléchargements est un lien direct (`<a href>`) qui ouvre immédiatement IPTV Smarters Pro sur Uptodown. L'utilisateur n'a aucun choix entre les applications Android disponibles.

## Objectif
Quand on clique sur la carte Android, afficher une petite fenêtre (dialog) listant plusieurs applications Android au choix, avec un bouton "Télécharger" par app qui ouvre le lien dans un nouvel onglet. Les cartes iOS et Windows restent inchangées (lien direct comme aujourd'hui).

## Options proposées dans le dialog Android
1. **M-IBO Player** — APK direct (`https://pub-32ee8b5200cb4935b28bee48941d5806.r2.dev/android/m-ibo.apk`)
2. **IPTV Smarters Pro** — lien existant (`https://iptv-smarters-pro.fr.uptodown.com/android#`)
3. **TiviMate** (Android TV / Fire TV) — `https://tivimate.com/`

Chaque option affiche : nom, courte description (type d'appareil / format), bouton "Télécharger".

## Changements techniques
- `src/routes/index.tsx` : dans la section Downloads, remplacer la carte Android `<a>` par un `<button>` qui ouvre un `Dialog` (shadcn, déjà utilisé dans le projet). Les cartes iOS et Windows restent des `<a href>`.
- Rien à changer côté espace client (`espace-client.downloads.tsx`) : il propose déjà les 3 apps.
- Aucune modification back-end, i18n, ou styles globaux. Réutilise `glass`, `btn-gold`, tokens existants — pas de nouvelles couleurs.

## Vérification
Build TypeScript + capture Playwright de la home (clic sur Android → dialog visible avec les 3 options).
