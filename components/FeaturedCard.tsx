import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import RecipeImage from './RecipeImage';
import FavoriteButton from './ui/FavoriteButton';
import type { Recipe } from '@/types';

export default function FeaturedCard({ recipe }: { recipe: Recipe }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(360, width - 64);
  const isChefChoice = recipe.tags?.includes("CHEF'S CHOICE");
  const isPopular = recipe.tags?.includes('POPULAIRE');
  return (
    <View style={{ width: cardWidth, marginRight: 16, backgroundColor: colors.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={recipe.name} onPress={() => router.push(`/recipe/${recipe.id}`)} activeOpacity={0.85}>
      <View style={{ height: cardWidth * 0.76 }}>
        <RecipeImage recipeId={recipe.id} category={recipe.category} style={{ width: '100%', height: '100%' }} borderRadius={0} />
        {(isPopular || isChefChoice) && <View style={{ position: 'absolute', bottom: 14, left: 14, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.photoControl, borderRadius: 8 }}>
          <Text style={{ color: colors.photoInk, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>{isChefChoice ? t('tagChefChoice') : t('tagPopular')}</Text>
        </View>}
      </View>
      <View style={{ padding: 18, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{recipe.region}</Text>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{recipe.duration} min</Text>
        </View>
        <Text style={{ fontSize: 23, fontWeight: '700', letterSpacing: -0.5, color: colors.text }}>{recipe.name}</Text>
        <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>{recipe.description}</Text>
      </View>
      </TouchableOpacity>
      <FavoriteButton recipeId={recipe.id} />
    </View>
  );
}
