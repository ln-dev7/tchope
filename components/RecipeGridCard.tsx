import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { CATEGORY_KEYS } from '@/constants/categories';
import RecipeImage from './RecipeImage';
import FavoriteButton from './ui/FavoriteButton';
import type { Recipe, UserRecipe } from '@/types';

export default function RecipeGridCard({ recipe }: { recipe: Recipe }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { gridCols } = useResponsive();
  return (
    <View style={{ width: `${(100 - (gridCols - 1) * 5) / gridCols}%`, marginBottom: 24 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={recipe.name} onPress={() => router.push(`/recipe/${recipe.id}`)} activeOpacity={0.85}>
      <View style={{ width: '100%', aspectRatio: 0.92, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface }}>
        <RecipeImage recipeId={recipe.id} category={recipe.category} imageUri={(recipe as UserRecipe).imageUri} isDark={isDark} style={{ width: '100%', height: '100%' }} borderRadius={0} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 12, letterSpacing: -0.3 }} numberOfLines={2}>{recipe.name}</Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 5 }}>{t(CATEGORY_KEYS[recipe.category])} · {recipe.duration} min</Text>
      </TouchableOpacity>
      <FavoriteButton recipeId={recipe.id} />
    </View>
  );
}
