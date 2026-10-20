# EAS Android : crash Metro après écriture du bundle

Cas observé le 20 octobre 2026 sur Travora et Tchopé, Expo SDK 58 / React Native 0.88 / NativeWind 5.

## Symptôme précis

La phase Bundle JavaScript écrit le bundle et copie les assets, puis termine par :

```text
Done writing bundle output
Segmentation fault (core dumped)
```

`expo export:embed --eager --platform android --dev false` termine avec le code 139.
Les avertissements eas-cli, punycode et crédits EAS ne sont pas la cause de ce crash.

## Contournement confirmé

LN a confirmé la réussite des builds EAS après désactivation des worker threads Metro sur Linux.
Le contournement est actif dans `metro.config.js`, après `getDefaultConfig` et avant `withNativewind` :

```js
if (process.platform === "linux") {
  config.transformer.unstable_workerThreads = false;
}
```

Metro utilise alors des processus enfants sur Linux ; macOS conserve son réglage Expo par défaut.
La cause suspectée est la fermeture des workers avec des modules natifs de compilation CSS ; le module exact n'a pas été identifié.

Retiré à la demande de LN après les builds réussis, puis réactivé le 20 octobre 2026 après récidive sur Travora 2.1.0 (27), commit 33b1f90 : le bundle et les 69 assets sont écrits, puis le processus termine avec le code 139. Garder ce réglage dans les deux apps jusqu’à confirmation d’un correctif amont par un build EAS Linux. Un build macOS réussi ne valide pas ce problème Linux. Ne pas confondre cette panne de compilation avec le crash WorkManager sur appareil (docs/ANDROID-16K.md).

Conserver indépendamment `globalClassNamePolyfill: false` dans `withNativewind` : ce réglage répond à un autre problème de compatibilité React Native / Expo Router.

## Équipe Apple des extensions

`expo.ios.appleTeamId` est défini avec la même équipe que `submit.production.ios.appleTeamId` dans eas.json. Le plugin apple-targets en a besoin pendant le prebuild. Son avertissement ne provoque pas le segfault Android. Pour créer une nouvelle extension ou synchroniser les App Groups, se connecter à Apple dès la première demande EAS ; ne choisir « no » que lorsque tous les profils et capacités sont déjà valides.
