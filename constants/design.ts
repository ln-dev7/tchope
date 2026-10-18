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

export const palettes = {
  light: {
    background: '#FAF8F4', surface: '#F0EBE3', card: '#FFFFFF',
    text: '#29241F', textSecondary: '#625B52', textMuted: '#70675D',
    accent: '#A84027', accentLight: '#C35A3A', accentOrange: '#A84027',
    green: '#41634B', greenLight: '#EAF0E7', greenText: '#36553F',
    border: '#E4DDD3', inputBg: '#F0EBE3', chipBg: '#F0EBE3',
    chipActiveBg: '#A84027', chipActiveText: '#FFFFFF',
    chipPeach: '#F7E7DE', chipPeachText: '#8B3824',
    tabBarBg: '#FFFEFC', ingredientBg: '#F7E7DE', headerBg: '#FAF8F4',
    accentSoft: '#F7E7DE', onAccent: '#FFFFFF',
    danger: '#AE302E', dangerSoft: '#FBEAE7',
    photoControl: '#FFFEFC', photoInk: '#29241F',
  },
  dark: {
    background: '#191713', surface: '#24211C', card: '#2D2923',
    text: '#F6F0E6', textSecondary: '#C8BFB2', textMuted: '#B0A697',
    accent: '#E8A184', accentLight: '#F0B69B', accentOrange: '#E8A184',
    green: '#A6C5A6', greenLight: '#27372A', greenText: '#BDDBB9',
    border: '#423B32', inputBg: '#24211C', chipBg: '#2D2923',
    chipActiveBg: '#E8A184', chipActiveText: '#301C13',
    chipPeach: '#412A21', chipPeachText: '#F2B49A',
    tabBarBg: '#201D18', ingredientBg: '#412A21', headerBg: '#191713',
    accentSoft: '#412A21', onAccent: '#301C13',
    danger: '#FFACA4', dangerSoft: '#462A27',
    photoControl: '#FFFEFC', photoInk: '#29241F',
  },
};
export type ThemeColors = typeof palettes.light;
