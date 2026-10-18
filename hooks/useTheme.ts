import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/SettingsContext';

import { palettes } from '@/constants/design';

export function useTheme() {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemScheme === 'dark';
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemScheme]);

  const colors = useMemo(() => (isDark ? palettes.dark : palettes.light), [isDark]);

  return { isDark, colors };
}
