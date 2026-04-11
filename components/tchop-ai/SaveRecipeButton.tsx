import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { UserRecipe } from '@/types';

export default function SaveRecipeButton({ recipe, isDark, colors, onSave, alreadySaved, t }: {
  recipe: UserRecipe; isDark: boolean; colors: any;
  onSave: (r: UserRecipe) => void; alreadySaved: boolean; t: (k: any) => string;
}) {
  const [saved, setSaved] = React.useState(alreadySaved);

  const handlePress = () => {
    if (saved) return;
    onSave(recipe);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={saved}
      activeOpacity={0.8}
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: saved
          ? (isDark ? '#2A2A2A' : '#F3F0EF')
          : colors.accent,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}>
      <Ionicons
        name={saved ? 'checkmark-circle' : 'book-outline'}
        size={18}
        color={saved ? colors.textMuted : '#FFFFFF'}
      />
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: saved ? colors.textMuted : '#FFFFFF',
      }}>
        {saved ? t('recipeAlreadyAdded') : t('addToCookbook')}
      </Text>
    </TouchableOpacity>
  );
}
