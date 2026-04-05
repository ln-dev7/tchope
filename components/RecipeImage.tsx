import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { getRecipeImage } from '@/constants/images';
import { getLocalImage } from '@/constants/images.local';
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
  Plat: '#FED3C7',
  Entrée: '#D1FFC8',
  Sauce: '#FFE4C8',
  Accompagnement: '#FFF3C8',
  Boisson: '#C8E4FF',
  Grillade: '#FFD1C8',
  Dessert: '#F3C8FF',
};

const categoryColorsDark: Record<Category, string> = {
  Plat: '#3A2520',
  Entrée: '#1A3A1A',
  Sauce: '#3A2A1A',
  Accompagnement: '#3A3520',
  Boisson: '#1A2A3A',
  Grillade: '#3A201A',
  Dessert: '#2A1A3A',
};

function LogoPlaceholder({ category, isDark }: { category: Category; isDark?: boolean }) {
  const bg = isDark
    ? (categoryColorsDark[category] || '#3A2520')
    : (categoryColors[category] || '#FED3C7');

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
 * Fallback chain: remote URL → local WebP → category placeholder + logo
 *
 * 1. Tries the remote URL first (expo-image caches it automatically)
 * 2. On error, falls back to the bundled local WebP image
 * 3. If both fail (or for user recipes without photo), shows the
 *    category-colored placeholder with the app logo
 */
export default function RecipeImage({ recipeId, category, imageUri, style, borderRadius = 24, isDark }: Props) {
  const [showLogo, setShowLogo] = useState(true);
  const [useLocal, setUseLocal] = useState(false);

  const isUserWithoutPhoto = !imageUri && recipeId.startsWith('user-');

  const handleLoad = useCallback(() => {
    setShowLogo(false);
  }, []);

  const handleError = useCallback(() => {
    if (!useLocal && !imageUri) {
      // Remote failed → try local
      setUseLocal(true);
    } else {
      // Local also failed (or user image failed) → show logo
      setShowLogo(true);
    }
  }, [useLocal, imageUri]);

  // User recipe without photo -> logo only
  if (isUserWithoutPhoto) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius }, style]}>
        <LogoPlaceholder category={category} isDark={isDark} />
      </View>
    );
  }

  // Determine image source based on current fallback state
  let imageSource;
  if (imageUri) {
    imageSource = { uri: imageUri };
  } else if (useLocal) {
    imageSource = getLocalImage(recipeId, category);
  } else {
    imageSource = { uri: getRecipeImage(recipeId, category) };
  }

  return (
    <View style={[{ overflow: 'hidden', borderRadius, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }, style]}>
      {showLogo && <LogoPlaceholder category={category} isDark={isDark} />}
      {imageSource && (
        <Image
          source={imageSource}
          style={[StyleSheet.absoluteFill]}
          contentFit="cover"
          transition={300}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
}
