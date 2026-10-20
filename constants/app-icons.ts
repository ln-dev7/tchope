// Launcher artwork is independent from app palettes and display mode.
export const APP_ICONS = [
  { id: 'default', nativeName: null, image: require('../assets/images/logo.png') },
  { id: 'plantain', nativeName: 'Plantain', image: require('../assets/app-icons/plantain/icon.png') },
  { id: 'ndole', nativeName: 'Ndole', image: require('../assets/app-icons/ndole/icon.png') },
  { id: 'nuit', nativeName: 'Nuit', image: require('../assets/app-icons/nuit/icon.png') },
  { id: 'doree', nativeName: 'Doree', image: require('../assets/app-icons/doree/icon.png') },
  { id: 'minimaliste', nativeName: 'Minimaliste', image: require('../assets/app-icons/minimaliste/icon.png') },
] as const;
export type AppIconId = typeof APP_ICONS[number]['id'];
export function isAppIconId(value: unknown): value is AppIconId {
  return APP_ICONS.some(icon => icon.id === value);
}
