import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';


import { useTheme } from '@/hooks/useTheme';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useTimer } from '@/context/TimerContext';
import LiveCookingScreen from '@/components/live-cooking/LiveCookingScreen';
import LiveIntroScreen from '@/components/live-cooking/LiveIntroScreen';

export default function LiveCookingRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  // Écran d'introduction (fonctionnement du mode Live) avant la session.
  const [started, setStarted] = React.useState(false);
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

  if (!started) {
    // Pas de SafeAreaView ici : figé à inset 0 dans un fullScreenModal iOS.
    // LiveIntroScreen gère lui-même le top inset via useSafeAreaInsets.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LiveIntroScreen onClose={() => router.back()} onStart={() => setStarted(true)} />
      </View>
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
