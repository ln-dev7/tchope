# Tchopé — refonte visuelle mobile

## Intention et périmètre

Un carnet de cuisine contemporain : ivoire, brun profond, terre cuite, vert sauge,
photos généreuses et hiérarchie éditoriale. Les cinq onglets et les destinations
existantes restent les repères du produit. Le redesign porte sur la présentation,
les libellés d'interface et l'accessibilité des contrôles.

## Références consultées

- [Kitchen Stories — présentation de l'application](https://pages.kitchenstories.com/en/app) :
  une cuisine organisée autour de la découverte, du carnet et de la préparation.
  Inspiration éditoriale, sans reprise d'assets ni d'identité.
- [Apple — Typography](https://developer.apple.com/design/human-interface-guidelines/typography) :
  hiérarchie, lecture et tailles adaptables.
- [Apple — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) :
  libellés des actions, états sélectionnés et lisibilité.
- [Material 3 — Color system](https://m3.material.io/styles/color/the-color-system) :
  rôles sémantiques et couples surface/texte, déclinés en clair et sombre.

## Plan appliqué

1. Centraliser les palettes et les rôles typographiques dans `constants/design.ts`.
2. Recomposer l'accueil autour d'une accroche éditoriale, de la recherche et des photos.
3. Refaire les cartes de découverte, résultats, listes et favoris ; partager le bouton
   favori avec une cible de 44 points et un libellé traduit.
4. Unifier les en-têtes des onglets, les filtres, les segments et la navigation.
5. Donner une lecture plus claire aux ingrédients, portions, étapes et conseils.
6. Harmoniser planning, courses, formulaires, notes, IA, cuisine guidée, minuteurs,
   onboarding, réglages et fenêtres d'abonnement/mise à jour.
7. Limiter la largeur de lecture à 840 points sur les principales vues tablette.
8. Vérifier rendu, interactions, traductions, contrastes, TypeScript, lint et bundles.

## Choix d'implémentation

- Polices natives : serif pour l'accroche et l'onboarding, sans serif pour l'interface.
  Aucun téléchargement de police ni nouvelle dépendance.
- Photos existantes ; fonds de remplacement moins saturés, adaptés au thème.
- Cartes et bouton favori séparés dans l'arbre d'accessibilité.
- Les règles Pro, prompts, requêtes IA, modèles de données, stockage, timers et
  chemins de navigation ne sont pas refondus.
- Le numéro de version reste celui du dépôt.

## Vérification

Résultats du 18 octobre 2026 :

- `npx tsc --noEmit` : réussi.
- `npm run lint` : aucune erreur, 28 avertissements préexistants restants
  (31 au départ, principalement dépendances de hooks).
- Export Expo de production iOS, Android et Web : réussi, 27 routes Web.
- Test existant `tests/pro-bridge.test.mts` : `proBridge OK` sous le runtime Node
  compatible avec `--experimental-strip-types` (le Node 20 du shell est trop ancien).
- 431 clés FR/EN présentes dans les deux langues.
- 16 couples sémantiques texte/fond contrôlés en clair/sombre : minimum 4,67:1.
- Aperçus à 320 × 700, 390 × 844 et 820 × 1180 : accueil, recherche, carnet,
  réglages et mode sombre anglais inspectés.
- Parcours vérifiés : recherche par nom, favori sans navigation accidentelle,
  ouverture d'une recette, changement de portions (8 → 9, 500 g → 562,5 g),
  ajout manuel au planning, génération locale des 12 ingrédients dans les courses,
  coche d'un ingrédient (11 à acheter / 1 déjà chez moi), création d'une recette,
  restauration des préférences après rechargement et passage à l'étape suivante.

Les interactions locales sont vérifiées sur Expo Web avec les composants partagés.
L'entrée Web existante journalise un avertissement/erreur lié au widget Android
(`registerHeadlessTask` non disponible sur Web) ; le rendu et les interactions
ci-dessus restent utilisables. Ce point de portabilité n'a pas été modifié dans
cette refonte UI.

Les intégrations caméra, voix, notifications et achats nécessitent un essai sur
appareil iOS/Android ; les exports Metro ne remplacent pas cet essai. Aucun appel IA
payant ni achat réel n'a été exécuté pour ce contrôle.
