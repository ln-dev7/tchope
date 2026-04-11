import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RecipeImage from '@/components/RecipeImage';
import type { Recipe } from '@/types';

export default function MiniRecipeCard({ recipe, isDark, colors, onPress }: {
  recipe: Recipe; isDark: boolean; colors: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: isDark ? '#3A3A3A' : '#E8E5E4',
      }}>
      <RecipeImage
        recipeId={recipe.id}
        category={recipe.category}
        imageUri={(recipe as any).imageUri}
        isDark={isDark}
        style={{ width: 48, height: 48 }}
        borderRadius={12}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {recipe.region} · {recipe.duration} min
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
