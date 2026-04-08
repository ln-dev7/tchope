<!-- Ce projet est sous licence GPL-3.0. Voir le fichier LICENSE pour plus de détails. -->

# Tchopé 🇨🇲

Application mobile de recettes camerounaises. Découvrez, cuisinez et partagez les saveurs authentiques du Cameroun.

## Fonctionnalités

- **116+ recettes** camerounaises authentiques avec ingrédients et étapes détaillées
- **Recherche avancée** par nom, ingrédient, durée, niveau de piment
- **Filtres par région** (10 régions du Cameroun)
- **Favoris** persistants (AsyncStorage)
- **Cookbook personnel** — ajoutez vos propres recettes avec photo
- **Timer de cuisson** avec bulle flottante et alerte à la fin
- **Recettes en vidéo** — tutoriels YouTube intégrés pour 23+ plats
- **Mode sombre** complet
- **Bilingue** français / anglais (changement instantané)
- **Partage de recettes** formatées (ingrédients + étapes)

## Stack technique

- **Expo SDK 54** (managed workflow)
- **TypeScript**
- **expo-router** v6 (file-based routing)
- **NativeWind v5** (TailwindCSS pour React Native)
- **expo-image** pour le chargement d'images
- **expo-image-picker** pour l'ajout de photos
- **AsyncStorage** pour la persistance locale
- **expo-haptics** pour le retour haptique

## Structure du projet

```
app/
  _layout.tsx              → Layout racine (providers)
  (tabs)/
    _layout.tsx            → Tab bar (4 onglets)
    index.tsx              → Accueil
    search.tsx             → Recherche
    cookbook.tsx            → Mon Cookbook
    settings.tsx           → Paramètres
  recipe/[id].tsx          → Détail recette
  add-recipe.tsx           → Ajouter une recette
  recipe-videos.tsx        → Vidéos YouTube
  recipes-list.tsx         → Liste filtrée (région / toutes)
components/                → Composants réutilisables
constants/
  translations.ts          → i18n FR/EN
  images.ts                → Mapping images (Wikimedia Commons)
  videos.ts                → Mapping vidéos YouTube
context/
  SettingsContext.tsx       → Thème + langue
  TimerContext.tsx          → Timer de cuisson flottant
  ToastContext.tsx          → Toasts visuels
data/
  recipes.ts               → 116 recettes parsées
hooks/                     → Hooks personnalisés
types/                     → Types TypeScript
```

## Lancer en développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npx expo start

# Scanner le QR code avec Expo Go (iOS/Android)
```

## Build pour les stores

### Prérequis

1. Installer EAS CLI :
```bash
npm install -g eas-cli
```

2. Se connecter à son compte Expo :
```bash
eas login
```

3. Configurer le projet (une seule fois) :
```bash
eas build:configure
```

### Build iOS (App Store)

```bash
# Build de production pour iOS
eas build --platform ios --profile production

# Soumettre sur l'App Store
eas submit --platform ios
```

> **Note :** Un compte Apple Developer (99$/an) est requis.

### Build Android (Google Play)

```bash
# Build de production pour Android (AAB)
eas build --platform android --profile production

# Soumettre sur le Google Play Store
eas submit --platform android
```

> **Note :** Un compte Google Play Developer (25$ one-time) est requis.

### Build les deux plateformes

```bash
eas build --platform all --profile production
```

### Configuration `eas.json`

Créez `eas.json` à la racine si absent :

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### Build de développement (recommandé pour tester les modules natifs)

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

## Auteur

**Leonel Ngoya** — [lndev.me](https://lndev.me)

## Licence

Projet privé — © 2025 Leonel Ngoya
