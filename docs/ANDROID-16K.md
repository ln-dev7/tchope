# Android release : WorkManager et pages de 16 ko

## Diagnostic du 20 octobre 2026

Le rapport Play de Travora 26 (2.0.0) signale un échec de démarrage dans `InitializationProvider → WorkManagerInitializer → WorkDatabase`. Cette trace Java ne prouve pas un mauvais alignement des bibliothèques natives, ni que tous les appareils Android auraient planté. Sans mapping/artefact original, la classe exacte supprimée ne peut pas être démontrée par cette seule trace.

Les règles Room/WorkDatabase ajoutées précédemment permettent le démarrage des nouvelles compilations release minifiées testées. Mais elles étaient **insuffisantes pour les tâches de fond** : le test réel des widgets a révélé `NoSuchMethodException: androidx.work.OverwritingInputMerger.<init>()`, puis `Could not create Input Merger`.

Correctif complémentaire dans `expo-build-properties.android.extraProguardRules` :

```proguard
-keep class * extends androidx.work.InputMerger { public <init>(); }
```

Les InputMerger sont instanciés par réflexion. Conserver le nom seul ne conserve pas forcément le constructeur en R8 full mode. Garder aussi les règles Room/WorkDatabase existantes. Ne pas désactiver toute la minification pour masquer le problème.

## Validation effectuée

- APK release minifiés des deux apps compilés localement.
- Émulateur officiel Google Android 16, ARM64, image Play Store 16 ko ; `adb shell getconf PAGE_SIZE` renvoie **16384**.
- Démarrage des deux apps sans exception fatale WorkDatabase.
- Ajout/rendu des vrais widgets RemoteViews et tâches `RNWidgetBackgroundTaskWorker` terminées avec `Worker result SUCCESS` après le correctif InputMerger.
- Vérification des segments ELF LOAD/RELRO et de l’alignement ZIP de toutes les bibliothèques ARM64 présentes : Travora 28, Tchopé 31, aucun échec.
- Test de régression dans `tests/widgets.test.cjs` sur les règles nécessaires.

```sh
python3 scripts/check-android-16k.py chemin/vers/app-release.apk
```

Le script contrôle l’artefact réel. Une inspection statique ne remplace pas le démarrage sur système 16 ko, ni les tests fonctionnels. Le build EAS/AAB destiné à Play devra à nouveau passer le rapport pré-lancement Google ; les APK locaux ne sont pas une validation de cet AAB encore non produit. Ne pas réutiliser le code de version 26 déjà téléversé ; EAS gère l’incrément distant.

Documentation officielle : https://developer.android.com/guide/practices/page-sizes
