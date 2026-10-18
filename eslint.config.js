// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // SDK 58 ajoute les diagnostics du compilateur React. Les garder visibles
    // en avertissement pour migrer progressivement les patterns existants
    // (Animated.Value, callbacks stables et synchronisation des données locales).
    // Les règles de Hooks et les autres erreurs restent bloquantes.
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
