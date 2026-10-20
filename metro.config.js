const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Expo 58 / NativeWind 5: EAS Linux can segfault when Metro worker threads exit.
// Keep this workaround until a Linux EAS build confirms an upstream fix.
// See docs/BUILD-TROUBLESHOOTING.md; macOS keeps Expo's default.
if (process.platform === "linux") {
  config.transformer.unstable_workerThreads = false;
}

// Les écrans utilisent `style`, sans className. Le proxy global de NativeWind 5
// n'expose pas toutes les API de RN 0.88 (NativeComponentRegistry, utilisé par
// Expo Router 58) et provoque un crash avant l'enregistrement de l'app.
// Conserver le compilateur CSS sans remplacer les exports React Native.
module.exports = withNativewind(config, { globalClassNamePolyfill: false });
