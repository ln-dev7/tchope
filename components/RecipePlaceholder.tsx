import React from 'react';
import { View, Text } from 'react-native';
import type { Category } from '@/types';

const categoryEmoji: Record<Category, string> = {
  Plat: '🍲',
  Entrée: '🥗',
  Sauce: '🫕',
  Accompagnement: '🍚',
  Boisson: '🥤',
  Grillade: '🔥',
  Dessert: '🍰',
};

const categoryColors: Record<Category, { bg: string; darkBg: string }> = {
  Plat: { bg: '#EFE0D4', darkBg: '#382C24' },
  Entrée: { bg: '#E5EBDD', darkBg: '#2B3325' },
  Sauce: { bg: '#EDE1CC', darkBg: '#373022' },
  Accompagnement: { bg: '#F1EBDC', darkBg: '#353124' },
  Boisson: { bg: '#DFE8EB', darkBg: '#263237' },
  Grillade: { bg: '#EFDFD7', darkBg: '#382925' },
  Dessert: { bg: '#EAE0E5', darkBg: '#352B32' },
};

type Props = {
  category: Category;
  size?: number;
  isDark?: boolean;
};

export default function RecipePlaceholder({ category, size = 96, isDark = false }: Props) {
  const emoji = categoryEmoji[category] || '🍲';
  const colors = categoryColors[category] || categoryColors.Plat;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: isDark ? colors.darkBg : colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.4 }}>{emoji}</Text>
    </View>
  );
}
