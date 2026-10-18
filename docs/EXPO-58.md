# Expo SDK 58

Migration depuis SDK 54 : React Native 0.88, React 19.3, TypeScript 6, Node 24.
Les versions des modules Expo sont alignées avec `expo install` et vérifiées avec `expo-doctor`.

## iOS local

Xcode 27 remplace Simulator.app par Device Hub. Le CLI du SDK 58 le reconnaît et les
projets générés adoptent le cycle de vie SceneDelegate requis par iOS 27.

```bash
nvm install
nvm use
npm ci
npm run ios -- --device
```

Choisir un simulateur dont le runtime est installé dans Xcode. Si Xcode n'est pas
sélectionné : `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
Le système minimum est iOS 16.4. Les iPhone compatibles gardent les onglets Liquid Glass.

Les dossiers `ios` et `android` sont générés et ignorés par Git. Après une mise à jour
native, sauvegarder toute modification manuelle avant `npx expo prebuild --clean`.
Les adaptations persistantes restent dans `app.json` et `plugins/`.
Le plugin CocoaPods aligne aussi les cibles des bundles de ressources sur le minimum React Native.
Si CocoaPods ne trouve pas une version récente de RevenueCat : `cd ios && pod install --repo-update`.

## Android et production

Android Studio et son JDK sont nécessaires pour `npm run android`.
Les profils EAS utilisent Node 24.19.0. Reconstruire les binaires iOS et Android avant
une soumission aux stores ; aucune mise à jour JavaScript seule ne remplace cette migration.

## Vérification

```bash
npx expo-doctor
npx tsc --noEmit
npm run lint
```

Les nouveaux diagnostics du compilateur React sont conservés comme avertissements
pour les patterns antérieurs à cette migration. Ils ne sont pas masqués ; leur
refonte est distincte de la compatibilité du SDK. Les règles de Hooks restent actives.

## NativeWind et le routeur

Les écrans utilisent les styles React Native. `globalClassNamePolyfill` est désactivé
car le proxy NativeWind 5 n'expose pas `NativeComponentRegistry` utilisé par Router 58,
ce qui empêchait le démarrage. Le compilateur CSS reste actif. Pour de futurs composants
avec `className`, utiliser les composants explicites de react-native-css plutôt que
réactiver ce remplacement global des imports natifs.

## Validation de la migration — 18 octobre 2026

- `expo-doctor` : 20/20 ; TypeScript : aucune erreur.
- Lint : aucune erreur bloquante, avertissements existants conservés.
- Exports JavaScript de production iOS et Android réussis.
- Compilation native iOS Debug avec Xcode 27 et Android Debug ARM64 réussie.
- Démarrage vérifié sur le simulateur iPhone 17 / iOS 27.
- Tests Pro, onglets, Live et transport IA ; accueil, paramètres, onglets natifs et minuteur jusqu’à la fin du compte à rebours.

Les achats réels et les entrées micro/caméra sur téléphone physique restent à
valider avant publication. Les tests Live automatisés utilisent des entrées simulées.
