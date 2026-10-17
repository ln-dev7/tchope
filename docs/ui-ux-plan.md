# Tchopé — UI/UX et visuels stores

## Objectif
Conserver l'identité crème/orange et les photos culinaires, simplifier le parcours découvrir → choisir → planifier → acheter → cuisiner. Français et anglais, thèmes clair et sombre.

## Mise en œuvre
1. Accueil : recettes avant les régions et l'IA, filtres utiles, sélections distinctes.
2. Recette : photo et métadonnées compactes, portions accessibles, cuisson fixe en bas, vidéo/guidage secondaires, accès planning/courses.
3. IA : accès explicites dans l'accueil et les recettes ; suppression du bouton flottant global.
4. Planning : ajout manuel avec date, repas et portions, accès courses en tête, suppression d'un repas.
5. Courses : ajouts indépendants du planning, quantités adaptées aux portions, contributions répétées conservées, coches persistantes et indépendantes de la langue.
6. Mes recettes : favoris affichés si seules recettes disponibles, notes secondaires, création sans doublon.
7. Accessibilité : contraste des recherches, commandes tactiles, suppression du plafond global de taille de police.
8. Vérification : TypeScript, lint ciblé, logique planning/courses, parcours interactifs, captures FR/EN clair/sombre.
9. Livraison : visuels marketing FR/EN iPhone, iPad, Android et sources reproductibles ; dimensions vérifiées auprès des stores.

Les captures de travail Expo Web servent à vérifier le rendu. Les gestes, lecteurs d'écran et permissions natifs nécessitent une validation sur appareils avant publication.

## Réalisé le 17 octobre 2026
Toutes les étapes d'implémentation ci-dessus sont réalisées. Le planning manuel propose les 14 prochains jours et les dates futures du planning existant. Les recettes personnelles sont utilisables dans le planning et les courses. Les courses affichent les contributions additionnelles (`500 g + 500 g`) pour ne pas dédupliquer à tort les quantités de plusieurs repas.

## Vérifications
- `npx tsc --noEmit` : réussite.
- `node --test tests/meal-shopping.test.cjs` : 9 tests couvrant portions, répétitions, identité des coches entre langues, dates locales, suppression, réutilisation d'un planning espacé et conservation des portions après ajustement IA.
- ESLint sur les fichiers modifiés : aucune erreur ; deux avertissements préexistants dans les réglages (handlers inutilisés).
- Exports des bundles Expo iOS, Android et Web : réussite.
- Parcours sur l'export Web : filtre rapide, recette → courses, coches après rechargement, recette → planning manuel, persistance du planning, suppression du dernier repas, favoris prioritaires.
- Rendu : français et anglais, clair et sombre, téléphone 320/390 px et tablette 768 px ; pas de débordement horizontal du document.

## Visuels
48 PNG sans transparence : 8 par langue (fr/en) et par format (iPhone 1320×2868, iPad 2064×2752, Android 1080×1920).
Les captures proviennent de l'export Expo Web du code mis à jour, avec des favoris et un planning de démonstration. Les icônes décoratives sont générées par imagegen ; les interfaces et les plats proviennent de l'application.
Les scripts et les sources sont livrés dans le dossier de visuels distinct du dépôt. Aucun appel IA de cuisine n'a été lancé pour fabriquer une réponse fictive.

## Validation avant diffusion
La compilation JavaScript ne remplace pas un build signé ni un test natif. Vérifier sur iPhone/iPad/Android les safe areas, le clavier, les grandes tailles de texte, VoiceOver/TalkBack et les fonctions audio/caméra/PDF avant de publier la version et les nouveaux visuels.
