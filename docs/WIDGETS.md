# Widgets — refonte octobre 2026

## Catalogue

- Découverte du jour : recette camerounaise et durée.
- Favoris : carnet de recettes.
- Planning : repas du jour, avec libellés FR/EN.
- Raccourcis : Recettes, Planning, TchopAI.
- Courses : ingrédients de la liste existante, déjà cochés exclus.

iOS : petit, moyen, grand, très grand (iPad), écran verrouillé circulaire, rectangulaire et en ligne ; contrôle TchopAI dans le Centre de contrôle sur iOS 18+. Le widget moyen se prête aussi à StandBy. Android : widgets redimensionnables, mise en page selon la place réelle ; variantes compactes conservées pour les installations existantes. Leur ancien dessin est remplacé, leurs identifiants restent stables.

Les widgets sont gratuits. Les liens vers l’assistant passent par l’écran habituel et ses règles Pro, sans déclencher d’appel IA depuis le widget. Ce sont des widgets et contrôles ; ils ne déclarent pas de Live Activity ni d’app watchOS.

## Données et fiabilité

`widgets/snapshot.ts` assemble les vraies données locales. `widgets/model.ts` définit un contrat versionné, sans notes privées, scans, conversations ou documents joints. Les dates sont locales (pas `toISOString()` pour identifier le jour). Huit jours sont préparés ; au-delà, le widget invite à ouvrir l’app. Une donnée manquante/expirée affiche un état vide utile, jamais le planning d’hier.

`WidgetSync` lit les données persistées au lancement, au changement d’état de l’app et toutes les 15 secondes uniquement au premier plan. Il ne redessine les widgets que si le contenu a changé. Sur Android, le handler relit aussi les données lors des événements système (ajout, redimensionnement, actualisation périodique). L’OS décide de l’heure effective des mises à jour.

iOS utilise `ExtensionStorage` et le groupe `group.com.lndev.tchope.widgets`, déclaré **dans l’app et l’extension**. L’ancien `UserDefaults.standard` isolé est supprimé. La timeline propose les changements de jour et demande une actualisation horaire. Les couleurs viennent des mêmes palettes que l’app ; le mode système suit l’apparence du widget.

Les photos sont les photos vérifiées de assets/images/recipes, réduites en JPEG dans targets/recipe-widget/assets. Aucun téléchargement photo externe ni remplacement par une image inventée.

## Construction et contrôle

Un **nouveau build natif iOS et Android est obligatoire**. EAS doit synchroniser la capacité App Groups et les profils de l’app + extension ; la configuration d’extension est déclarée dans app.json. Ne jamais réintroduire les icônes alternatives de l’app dans les build settings de l’extension.

- `npm run test:widgets` : dates locales, données expirées, filtres de confidentialité, liens, entitlements, ressources.
- `npm run test:personalisation`, TypeScript, lint.
- Compilation release Android (R8), compilation de la cible WidgetKit iOS.
- Rendus de contrôle des vues SwiftUI, toutes tailles en clair/sombre. À compléter sur appareils physiques pour les comportements propres au launcher et au verrouillage.

Pour ajouter un widget : nouvelle page dans le snapshot, identifiant dans `WIDGET_KINDS` et app.json, nouvelle configuration WidgetKit, libellés FR/EN et prévisualisation du sélecteur. La synchronisation reste commune.

## Vérification release Android

Les tâches de widgets utilisent WorkManager. Conserver le constructeur des sous-classes d’InputMerger en R8 full mode : voir `docs/ANDROID-16K.md`. Des widgets compacts, moyens, grands et sombres ont été rendus avec les vrais RemoteViews sur l’émulateur Android 16 ARM64 à pages de 16 ko.
