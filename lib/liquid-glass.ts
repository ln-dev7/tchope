import { Platform } from 'react-native';

// Les onglets natifs prennent leur apparence Liquid Glass dans UIKit (build Xcode 26+).
// On conserve la navigation actuelle sur iPad, Android, web et les anciennes versions d'iOS.
export const LIQUID_GLASS =
  Platform.OS === 'ios' &&
  !Platform.isPad &&
  !Platform.isTV &&
  Number.parseInt(String(Platform.Version), 10) >= 26;
