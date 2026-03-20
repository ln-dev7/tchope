import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

const lightColors = {
  background: '#F9F6F5',
  surface: '#F3F0EF',
  card: '#FFFFFF',
  text: '#2F2F2E',
  textSecondary: '#5C5B5B',
  textMuted: '#74544A',
  accent: '#914700',
  accentLight: '#F97F06',
  accentOrange: '#E67400',
  green: '#0A6A1D',
  greenLight: 'rgba(157,248,152,0.3)',
  greenText: '#006016',
  border: '#EAE7E7',
  inputBg: '#DFDCDC',
  chipBg: '#F3F0EF',
  chipActiveBg: '#914700',
  chipActiveText: '#FFFFFF',
  chipPeach: '#EFC6B9',
  chipPeachText: '#51352C',
  tabBarBg: 'rgba(255,255,255,0.9)',
  ingredientBg: '#FED3C7',
  headerBg: 'rgba(249,246,245,0.8)',
} as const;

const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#252525',
  text: '#FAFAFA',
  textSecondary: '#B0B0B0',
  textMuted: '#A0978F',
  accent: '#F59E42',
  accentLight: '#FFB347',
  accentOrange: '#FFA726',
  green: '#4CAF50',
  greenLight: 'rgba(76,175,80,0.15)',
  greenText: '#81C784',
  border: '#333333',
  inputBg: '#1E1E1E',
  chipBg: '#2A2A2A',
  chipActiveBg: '#F59E42',
  chipActiveText: '#1A1200',
  chipPeach: '#3A2518',
  chipPeachText: '#FFCBA4',
  tabBarBg: 'rgba(18,18,18,0.95)',
  ingredientBg: '#3D2215',
  headerBg: 'rgba(18,18,18,0.85)',
} as const;

export function useTheme() {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemScheme === 'dark';
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return { isDark, colors };
}
