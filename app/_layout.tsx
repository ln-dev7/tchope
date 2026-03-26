import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SettingsProvider } from '@/context/SettingsContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { UserRecipesProvider } from '@/context/UserRecipesContext';
import { TimerProvider } from '@/context/TimerContext';
import { ToastProvider } from '@/context/ToastContext';
import { RatingProvider } from '@/context/RatingContext';
import { useTheme } from '@/hooks/useTheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function InnerLayout() {
  const { isDark } = useTheme();

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#121212', card: '#121212' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F9F6F5', card: '#F9F6F5' } };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="add-recipe" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="recipe-videos" />
        <Stack.Screen name="recipes-list" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <FavoritesProvider>
        <UserRecipesProvider>
          <ToastProvider>
            <TimerProvider>
              <RatingProvider>
                <InnerLayout />
              </RatingProvider>
            </TimerProvider>
          </ToastProvider>
        </UserRecipesProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}
