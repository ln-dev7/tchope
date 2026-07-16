import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useTimer } from '@/context/TimerContext';
import LiveCookingScreen from '@/components/live-cooking/LiveCookingScreen';
import LiveUnlockScreen from '@/components/live-cooking/LiveUnlockScreen';

export default function LiveCookingRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  // « 1 pub = 1 session » : le déblocage ne vaut que pour ce montage d'écran —
  // rouvrir Live plus tard repasse par le portail.
  const [unlocked, setUnlocked] = React.useState(false);
  const { isTimerRunning, stopAllTimers } = useTimer();

  // Stop any active timer when launching Live cooking
  React.useEffect(() => {
    if (isTimerRunning) {
      stopAllTimers();
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

  if (!unlocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <LiveUnlockScreen onClose={() => router.back()} onUnlocked={() => setUnlocked(true)} />
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
