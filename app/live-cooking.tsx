import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import LiveCookingScreen from '@/components/live-cooking/LiveCookingScreen';
import PremiumGate from '@/components/premium/PremiumGate';

export default function LiveCookingRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PremiumGate onClose={() => router.back()}>
        <LiveCookingScreen
          recipe={recipe}
          initialStep={step ? parseInt(step, 10) : 0}
          onClose={() => router.back()}
        />
      </PremiumGate>
    </SafeAreaView>
  );
}
