# Personnalisation Pro — Tchopé 2.2.0

Dans Réglages → Personnalisation : **6 icônes (originale comprise)** et **4 palettes**, chacune en clair et sombre. Les noms sont traduits en français et anglais dans `constants/pro-translations.ts`.

## Règles produit

- `settings.appIcon` et `settings.palette` sont indépendants. `settings.theme` reste le choix gratuit clair/sombre/système.
- Choisir une variante exige Pro. Un choix verrouillé ouvre le paywall existant. Le retour aux choix par défaut reste gratuit.
- Après expiration, les choix en place sont conservés. Aucun changement natif automatique au démarrage, au renouvellement ou lors d'un changement de palette.
- Anciennes installations : migration vers la palette et l'icône originales, sans modifier langue, mode, notifications ou données.
- Le nom de l'app, le splash, les widgets et l'icône de notification conservent l'identité originale. Changer la palette ne change jamais l'icône du lanceur.

## Kit de thèmes commun aux deux apps

`constants/themes.ts` contient `defaultPalette`, `themes`, `PALETTE_IDS`, `DEFAULT_PALETTE` et `resolveColors`. Les écrans utilisent `useTheme()` ; ne pas importer une palette directement dans un écran. `fixedColors` conserve les couleurs sémantiques (succès, erreur, statuts), marques tierces, contrôles sur photos et ombres. Aucun écran actuel ne dépend de classes NativeWind pour ces couleurs : pas de double source dans global.css.

Pour ajouter une palette : définir tous les jetons clair/sombre à partir de `defaultPalette`, ajouter l'identifiant à `PALETTE_IDS`, traduire son nom dans `personalisation.themeNames`. Le sélecteur la propose automatiquement. Vérifier contrastes, badges, onglets, assistant, paywall et fond natif. Les jetons legacy conservent précisément les anciens rendus du thème par défaut ; ils ne doivent pas être supprimés sans comparaison visuelle.

## Ajouter une icône

1. Créer `assets/app-icons/<id>/master.svg`, `foreground.svg`, `background.svg`, `monochrome.svg`, tous en 1024 × 1024. Le logo des adaptive icons reste dans la zone sûre centrale ; le fond est plein, les calques foreground/monochrome ont un alpha.
2. `npm run icons:render` génère `icon.png` (opaque iOS), `foreground.png`, `background.png` (opaque) et `monochrome.png` (Android 13+).
3. Ajouter l'entrée avec `require()` statique dans `constants/app-icons.ts`, ses noms FR/EN et les chemins dans le plugin `expo-alternate-app-icons` de `app.json`. Garder des noms natifs stables : ils sont persistés par le système.
4. Relancer les tests puis reconstruire les binaires iOS ET Android. Une mise à jour JavaScript seule ne peut pas ajouter d'icône native.

## Intégration native et erreurs

`expo-alternate-app-icons` est figé en 8.0.0. `postinstall: patch-package` applique le correctif versionné Android : lecture de l'alias réellement activé, permutation atomique sur API 33+, activation de la destination avant désactivation de l'ancienne sur les versions antérieures. L'activité principale reste active pour les liens profonds et widgets.

`plugins/with-personalisation.js` est enregistré AVANT le plugin upstream dans app.json (les actions mod Expo s’exécutent en ordre inverse). Il le complète : alias original dédié au lanceur, liens profonds sur MainActivity, exclusion des extensions iOS des noms d'icônes de l'app. Ne pas supprimer le patch ou changer la dépendance sans revalider ces points.

`lib/app-icons.ts` charge le module optionnel : Expo Go, web et anciens development builds continuent à démarrer. L'app affiche un message si le changement est indisponible. Une erreur native ne remplace pas le choix enregistré ; une erreur de stockage est signalée. Le sélecteur se resynchronise avec l'icône réelle au retour au premier plan. Les écritures de réglages sont sérialisées pour éviter de perdre un changement de langue ou de thème pendant une confirmation native.

## Validation / limites

- `npm run test:personalisation` : migration, indépendance des choix, modes, expiration, paywall, échec natif, stockage et interactions rapides ; conservation des couleurs historiques en clair et sombre.
- Contrôle TypeScript + Expo lint ; exports Android de production, génération native iOS/Android, compilation du module Kotlin et des catalogues iOS via actool (iPhone + iPad).
- Captures de contrôle des écrans principaux en 4 palettes × 2 modes sur simulateur iPhone.
- **Avant publication : nouveau build EAS obligatoire**, tester les changements successifs puis retour à l'original sur un vrai iPhone et un vrai Android, fermeture/réouverture, liens profonds, widgets et achat/restauration Pro.
- iOS peut afficher une confirmation système. Certains lanceurs Android rafraîchissent avec retard, déplacent un raccourci ou relancent l'app ; ne pas promettre un changement instantané universel.
- Les images sont embarquées : elles augmentent la taille du binaire. Mesurer la taille finale dans EAS/les stores ; la taille des PNG sources n'est pas la taille du téléchargement optimisé.

### Résultats du 20 octobre 2026

Les captures natives des écrans principaux, réglages, personnalisation et assistant ont été comparées en quatre palettes et deux modes sur iPhone 17. La grille a aussi été ouverte sur iPhone Duo. Le contenu du thème par défaut a été comparé au dernier commit Git : aucun pixel différent dans les zones de contenu contrôlées (barre système, overlay de développement et zones variables exclus). Le nouvel écran ouvre bien le paywall pour un choix verrouillé ; le sélecteur Pro change la palette en gardant l’icône, et un ancien build affiche correctement le message de module natif indisponible. Les réglages de simulation ont été restaurés.

Les tests de compilation ne remplacent pas les essais des icônes sur un téléphone physique. Aucun achat ni appel IA réel n’a été effectué pour ce changement.

## Ajustements du 20 octobre

Six icônes au premier affichage, bouton Voir plus/Voir moins si le catalogue dépasse six éléments ; pas de bloc d’aperçu en bas. L’icône et le thème restent indépendants. La ligne du paywall est placée en dernier.

Tchopé : 6 icônes et 6 palettes, avec Bissap et Cacao. Icône Plantain et palette Plantain gratuites en plus des choix d’origine.
La politique est centralisée dans `lib/personalisation-policy.ts` (`FREE_ICON`, `FREE_PALETTE`). Les cartes et les actions utilisent la même règle ; les autres nouveaux choix ouvrent le paywall pour les non-abonnés. Un choix conservé après expiration reste disponible.
