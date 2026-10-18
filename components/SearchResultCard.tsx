import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import RecipeImage from './RecipeImage';
import FavoriteButton from './ui/FavoriteButton';
import type { Recipe, UserRecipe } from '@/types';

export default function SearchResultCard({ recipe }: { recipe: Recipe }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const difficultyLabel = recipe.difficulty === 'Easy' ? t('easy') : recipe.difficulty === 'Hard' ? t('hard') : t('medium');
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={recipe.name} onPress={() => router.push(`/recipe/${recipe.id}`)} activeOpacity={0.85}>
      <View style={{ width: '100%', aspectRatio: 1.85, maxHeight: 300 }}>
        <RecipeImage recipeId={recipe.id} category={recipe.category} imageUri={(recipe as UserRecipe).imageUri} isDark={isDark} style={{ width: '100%', height: '100%' }} borderRadius={0} />
      </View>
      <View style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.accent, textTransform: 'uppercase' }}>{recipe.region}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{difficultyLabel}</Text>
        </View>
        <Text style={{ fontSize: 21, fontWeight: '700', letterSpacing: -0.4, color: colors.text }}>{recipe.name}</Text>
        <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>{recipe.description}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 12, marginTop: 2, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name="time-outline" size={14} color={colors.textSecondary} /><Text style={{ fontSize: 12, color: colors.textSecondary }}>{recipe.duration} min</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name="flame-outline" size={14} color={colors.textSecondary} /><Text style={{ fontSize: 12, color: colors.textSecondary }}>{t(recipe.spiciness === 'Mild' ? 'mild' : recipe.spiciness === 'Extra Hot' ? 'extraHot' : 'mediumSpice')}</Text></View>
          <Text style={{ flexGrow: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.accent }}>{t('viewRecipe')} →</Text>
        </View>
      </View>
      </TouchableOpacity>
      <FavoriteButton recipeId={recipe.id} />
    </View>
  );
}
