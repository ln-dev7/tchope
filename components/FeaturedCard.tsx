import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';
import RecipeImage from './RecipeImage';
import type { Recipe } from '@/types';

type Props = {
  recipe: Recipe;
};

export default function FeaturedCard({ recipe }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const router = useRouter();

  const isPopular = recipe.tags?.includes('POPULAIRE');
  const isChefChoice = recipe.tags?.includes("CHEF'S CHOICE");

  return (
    <TouchableOpacity
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      activeOpacity={0.9}
      style={{ width: 300, marginRight: 24 }}>
      <View
        style={{
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
        }}>
        {/* Image */}
        <View style={{ height: 224, position: 'relative' }}>
          <RecipeImage recipeId={recipe.id} category={recipe.category} style={{ width: '100%', height: '100%' }} borderRadius={0} />
          {/* Tag badge */}
          {(isPopular || isChefChoice) && (
            <View
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                backgroundColor: isChefChoice ? '#0A6A1D' : colors.accent,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 9999,
              }}>
              <Text
                style={{
                  color: isChefChoice ? '#D1FFC8' : '#FFF0E8',
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}>
                {isChefChoice ? t('tagChefChoice') : t('tagPopular')}
              </Text>
            </View>
          )}
          {/* Favorite button */}
          <TouchableOpacity
            accessibilityRole="button" accessibilityLabel={t(isFavorite(recipe.id) ? 'removeFavorite' : 'addFavorite')}
            onPress={() => { const was = isFavorite(recipe.id); toggleFavorite(recipe.id); toast(was ? t('favoriteRemoved') : t('favoriteAdded'), was ? 'custom' : 'heart'); }}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 20,
              backgroundColor: 'rgba(249,246,245,0.8)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons
              name={isFavorite(recipe.id) ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite(recipe.id) ? '#E74C3C' : '#5C5B5B'}
            />
          </TouchableOpacity>
        </View>
        {/* Info */}
        <View style={{ padding: 20, gap: 4 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.text,
            }}>
            {recipe.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 20,
            }}
            numberOfLines={2}>
            {recipe.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
