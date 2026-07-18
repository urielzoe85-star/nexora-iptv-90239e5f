## Objectif
Rendre la section "Avis clients" de la home plus crédible avec 4 portraits photoréalistes générés et 4 témoignages réécrits en langage plus naturel.

## Étapes

1. **Générer 4 portraits photoréalistes** (agent `generate_image`, premium, format carré 512×512, sauvegardés dans `src/assets/`) — 4 profils diversifiés cohérents avec les noms/villes :
   - Homme afro-descendant ~30 ans, souriant, extérieur urbain (Lagos) → `testimonial-daniel.jpg`
   - Femme blanche ~35 ans, cheveux châtains, sourire discret, intérieur parisien lumineux → `testimonial-amelie.jpg`
   - Homme latino ~40 ans, barbe courte, terrasse ensoleillée (Madrid) → `testimonial-carlos.jpg`
   - Femme africaine ~28 ans, foulard coloré, ambiance chaleureuse (Dakar) → `testimonial-fatou.jpg`
   
   (Portraits candides "selfie/photo perso" — pas de style studio publicitaire, pour éviter l'effet IA/stock.)

2. **Externaliser via `lovable-assets`** chaque JPG puis supprimer le binaire local, comme les autres assets du projet.

3. **Réécrire les 4 témoignages** dans `src/routes/index.tsx` (fonction `Testimonials`, lignes 508–549) : ton plus parlé, détails concrets (nom d'appareil, chaîne préférée, moyen de paiement local, délai). Exemples de direction :
   - Daniel : Canal+ Sport + Premier League sur Firestick, activation en 2 min.
   - Amélie : beIN + Netflix VF sur Apple TV, support WhatsApp réactif.
   - Carlos : LaLiga + films VOST, testé 4 concurrents avant.
   - Fatou : bouquet Nollywood + dessins animés enfants, paiement Orange Money.

4. **Remplacer l'avatar cercle-initiale par un vrai `<img>`** :
   - Ajouter un champ `photo` dans chaque objet du tableau `testimonials` pointant vers `photo.url` (import du `.asset.json`).
   - Remplacer le `<div>…{tt.name[0]}</div>` par `<img src={tt.photo} alt={tt.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-[color:var(--gold)]/40" loading="lazy" />`.
   - Garder la mise en page glass/étoiles inchangée.

## Détails techniques

- Aucune clé i18n modifiée (les témoignages sont déjà en dur dans le composant, pas dans `messages.ts`).
- Aucune modification backend, DB, SEO, routes.
- Les portraits sont générés en `premium` pour un rendu photoréaliste crédible, puis compressés côté CDN Lovable.

## Hors périmètre
Pas de refonte des étoiles, du titre, ni du reste de la page. Pas de photos de vraies personnes (choix : IA photoréaliste).
