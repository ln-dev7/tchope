import { Platform, StyleSheet } from 'react-native';

// Shared presentation tokens. Business state and navigation stay in their screens.
export const layout = { gutter: 24, radius: 20, controlRadius: 14, touchTarget: 48, maxWidth: 840 };
export const type = StyleSheet.create({
  display: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 36, lineHeight: 43, letterSpacing: -1 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.9 },
  section: { fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  body: { fontSize: 15, lineHeight: 23 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
});

export { defaultPalette as palettes } from './themes';
export type { ThemeColors } from './themes';
