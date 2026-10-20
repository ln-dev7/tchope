import { fixedColors } from "@/constants/themes";
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
  Plat: { bg: fixedColors.dishLight, darkBg: fixedColors.dishDark },
  Entrée: { bg: fixedColors.starterLight, darkBg: fixedColors.starterDark },
  Sauce: { bg: fixedColors.sauceLight, darkBg: fixedColors.sauceDark },
  Accompagnement: { bg: fixedColors.sideLight, darkBg: fixedColors.sideDark },
  Boisson: { bg: fixedColors.drinkLight, darkBg: fixedColors.drinkDark },
  Grillade: { bg: fixedColors.grillLight, darkBg: fixedColors.grillDark },
  Dessert: { bg: fixedColors.dessertLight, darkBg: fixedColors.dessertDark },
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
