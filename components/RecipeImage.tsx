import { fixedColors } from "@/constants/themes";
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Image } from 'expo-image';
import { getRecipeImage } from '@/constants/images';
import type { Category } from '@/types';

type Props = {
  recipeId: string;
  category: Category;
  imageUri?: string | null;
  style?: object;
  borderRadius?: number;
  isDark?: boolean;
};

const categoryColors: Record<Category, string> = {
  Plat: fixedColors.dishLight,
  Entrée: fixedColors.starterLight,
  Sauce: fixedColors.sauceLight,
  Accompagnement: fixedColors.sideLight,
  Boisson: fixedColors.drinkLight,
  Grillade: fixedColors.grillLight,
  Dessert: fixedColors.dessertLight,
};

const categoryColorsDark: Record<Category, string> = {
  Plat: fixedColors.dishDark,
  Entrée: fixedColors.starterDark,
  Sauce: fixedColors.sauceDark,
  Accompagnement: fixedColors.sideDark,
  Boisson: fixedColors.drinkDark,
  Grillade: fixedColors.grillDark,
  Dessert: fixedColors.dessertDark,
};

function LogoPlaceholder({ category, isDark }: { category: Category; isDark?: boolean }) {
  const bg = isDark
    ? (categoryColorsDark[category] || fixedColors.dishDark)
    : (categoryColors[category] || fixedColors.dishLight);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: 64, height: 64, borderRadius: 12 }}
        contentFit="contain"
      />
    </View>
  );
}

/**
 * Photo de la recette (intégrée à l'app, ou imageUri d'une recette de l'utilisateur).
 * Sans photo, ou si elle ne charge pas : placeholder de la catégorie avec le logo.
 */
export default function RecipeImage({ recipeId, category, imageUri, style, borderRadius = 18, isDark: darkOverride }: Props) {
  const { isDark: themeDark, colors } = useTheme();
  const isDark = darkOverride ?? themeDark;
  const [showLogo, setShowLogo] = useState(true);

  const resolvedImage = imageUri ? imageUri : getRecipeImage(recipeId, category);
  // Recette de l'utilisateur sans photo, ou plat sans photo fiable : placeholder (jamais de fausse image).
  const isWithoutPhoto = resolvedImage == null;

  const handleLoad = useCallback(() => {
    setShowLogo(false);
  }, []);

  const handleError = useCallback(() => {
    setShowLogo(true);
  }, []);

  if (isWithoutPhoto) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius }, style]}>
        <LogoPlaceholder category={category} isDark={isDark} />
      </View>
    );
  }

  const imageSource = typeof resolvedImage === 'string'
    ? { uri: resolvedImage }
    : resolvedImage;

  return (
    <View style={[{ overflow: 'hidden', borderRadius, backgroundColor: colors.surface }, style]}>
      {showLogo && <LogoPlaceholder category={category} isDark={isDark} />}
      <Image
        source={imageSource}
        style={[StyleSheet.absoluteFill]}
        contentFit="cover"
        transition={300}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
}
