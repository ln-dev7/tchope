import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { resolveColors } from '@/constants/themes';
export type { ThemeColors } from '@/constants/themes';

export function useTheme() {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();
  const isDark = settings.theme === 'system' ? systemScheme === 'dark' : settings.theme === 'dark';
  return { isDark, colors: resolveColors(settings.palette, isDark) };
}
