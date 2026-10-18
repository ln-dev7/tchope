# Onglets iPhone

Les iPhone sous iOS 26 ou plus utilisent `NativeTabs` d'Expo Router 6 (SDK 54), comme Travora.
L'apparence Liquid Glass et les adaptations d'accessibilité sont fournies par UIKit ; compiler avec Xcode 26 ou plus.
La teinte active suit la palette de Tchopé. Les cinq routes, leurs libellés FR/EN et leur ordre sont conservés.
La barre reste visible pendant le défilement.

Android, le web, l'iPad et iOS < 26 conservent les onglets classiques. `lib/liquid-glass.ts` centralise cette sélection.
Les écrans gèrent déjà le haut avec `SafeAreaView` et réservent `112 + bottom` en bas : leurs scrollviews principales
utilisent `contentInsetAdjustmentBehavior="never"` pour éviter l'ajout automatique d'une deuxième marge.

Vérification avant publication sur iPhone : cinq onglets, retour d'une recette, défilement jusqu'au dernier élément,
clavier de recherche, thème clair/sombre, français/anglais et Réduire la transparence.
Tests de sélection de plateforme et de routes : `npm run test:tabs`.
