import "../global.css";
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { SettingsProvider } from '@/context/SettingsContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { UserRecipesProvider } from '@/context/UserRecipesContext';
import { TimerProvider } from '@/context/TimerContext';
import { ToastProvider } from '@/context/ToastContext';
import { RatingProvider } from '@/context/RatingContext';
import { MealPlannerProvider } from '@/context/MealPlannerContext';
import { useTheme } from '@/hooks/useTheme';
import NetworkBanner from '@/components/NetworkBanner';
import { ONBOARDING_KEY } from './onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

function InnerLayout() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (val !== 'true') {
        router.replace('/onboarding' as any);
      }
      setOnboardingChecked(true);
    });
  }, []);

  // Deep link on notification tap
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (typeof screen === 'string') {
        router.push(screen as any);
      }
    });
    return () => sub.remove();
  }, [router]);

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
        <Stack.Screen name="ai-recipes" />
        <Stack.Screen name="timer" />
        <Stack.Screen name="shopping-list" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="cooking-mode" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
      </Stack>
      <NetworkBanner />
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
                <MealPlannerProvider>
                  <InnerLayout />
                </MealPlannerProvider>
              </RatingProvider>
            </TimerProvider>
          </ToastProvider>
        </UserRecipesProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}
