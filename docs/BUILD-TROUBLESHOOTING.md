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
En cas de réapparition du même crash, ajouter dans `metro.config.js`, après `getDefaultConfig` et avant `withNativewind` :

```js
if (process.platform === "linux") {
  config.transformer.unstable_workerThreads = false;
}
```

Metro utilise alors des processus enfants sur Linux ; macOS conserve son réglage Expo par défaut.
La cause suspectée est la fermeture des workers avec des modules natifs de compilation CSS ; le module exact n'a pas été identifié.

Le contournement a été retiré à la demande de LN après les builds réussis. Il n'est donc plus actif pour les prochains builds : si le même problème revient, le réappliquer et reconstruire. Ne pas appliquer cette solution à toute erreur JavaScript sans examiner les logs.

Conserver indépendamment `globalClassNamePolyfill: false` dans `withNativewind` : ce réglage répond à un autre problème de compatibilité React Native / Expo Router.
