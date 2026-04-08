import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useLicense } from '@/context/LicenseContext';
import { useTimer } from '@/context/TimerContext';
import LiveCookingScreen from '@/components/live-cooking/LiveCookingScreen';
import LiveExplainScreen from '@/components/premium/LiveExplainScreen';

export default function LiveCookingRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  const { isPremium } = useLicense();
  const { isTimerRunning, stopTimer } = useTimer();

  // Stop any active timer when launching Live cooking
  React.useEffect(() => {
    if (isTimerRunning) {
      stopTimer();
    }
  }, []);

  const recipe =
    recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.text }}>Recipe not found</Text>
      </View>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <LiveExplainScreen onClose={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <LiveCookingScreen
      recipe={recipe}
      initialStep={step ? parseInt(step, 10) : 0}
      onClose={() => router.back()}
    />
  );
}
