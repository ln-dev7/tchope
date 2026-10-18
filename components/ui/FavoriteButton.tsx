import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';

export default function FavoriteButton({ recipeId }: { recipeId: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const selected = isFavorite(recipeId);
  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={t(selected ? 'removeFavorite' : 'addFavorite')}
      onPress={(event) => { event.stopPropagation(); toggleFavorite(recipeId); toast(t(selected ? 'favoriteRemoved' : 'favoriteAdded'), selected ? 'custom' : 'heart'); }}
      activeOpacity={0.8}
      style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.photoControl }}>
      <Ionicons name={selected ? 'heart' : 'heart-outline'} size={21} color={selected ? '#A84027' : colors.photoInk} />
    </TouchableOpacity>
  );
}
