import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { CATEGORY_KEYS } from '@/constants/categories';
import RecipeImage from './RecipeImage';
import type { Recipe } from '@/types';

type Props = {
  recipe: Recipe;
  titlePaddingRight?: number;
};

export default function RecipeCard({ recipe, titlePaddingRight }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={recipe.name}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1, borderColor: colors.border,
        padding: 12,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
      }}>
      {/* Thumbnail */}
      <RecipeImage recipeId={recipe.id} category={recipe.category} imageUri={(recipe as any).imageUri} isDark={isDark} style={{ width: 88, height: 88 }} borderRadius={12} />
      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: colors.text,
            ...(titlePaddingRight ? { paddingRight: titlePaddingRight } : {}),
          }}>
          {recipe.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="restaurant-outline" size={12} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {t(CATEGORY_KEYS[recipe.category])}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time-outline" size={13} color={colors.text} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text }}>
              {recipe.duration} min
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
