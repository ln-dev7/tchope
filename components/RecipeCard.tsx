import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import RecipeImage from './RecipeImage';
import type { Recipe } from '@/types';

type Props = {
  recipe: Recipe;
  titlePaddingRight?: number;
};

export default function RecipeCard({ recipe, titlePaddingRight }: Props) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      activeOpacity={0.8}
      style={{
        backgroundColor: isDark ? colors.surface : colors.surface,
        borderRadius: 32,
        padding: 12,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
      }}>
      {/* Thumbnail */}
      <RecipeImage recipeId={recipe.id} category={recipe.category} imageUri={(recipe as any).imageUri} isDark={isDark} style={{ width: 96, height: 96 }} borderRadius={32} />
      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            ...(titlePaddingRight ? { paddingRight: titlePaddingRight } : {}),
          }}>
          {recipe.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {recipe.region}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 4 }}>
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
