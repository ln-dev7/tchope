const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Les écrans utilisent `style`, sans className. Le proxy global de NativeWind 5
// n'expose pas toutes les API de RN 0.88 (NativeComponentRegistry, utilisé par
// Expo Router 58) et provoque un crash avant l'enregistrement de l'app.
// Conserver le compilateur CSS sans remplacer les exports React Native.
module.exports = withNativewind(config, { globalClassNamePolyfill: false });
