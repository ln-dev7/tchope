import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { getRecipeImage } from '@/constants/images';
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

type Props = {
  recipeId: string;
  category: Category;
  imageUri?: string | null;
  style?: object;
  borderRadius?: number;
  isDark?: boolean;
};

function EmojiPlaceholder({ category, isDark }: { category: Category; isDark?: boolean }) {
  const emoji = categoryEmoji[category] || '🍲';
  const bg = isDark
    ? (categoryColorsDark[category] || '#3A2520')
    : (categoryColors[category] || '#FED3C7');

  return (
    <View style={{ width: '100%', height: '100%', backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 48 }}>{emoji}</Text>
    </View>
  );
}

export default function RecipeImage({ recipeId, category, imageUri, style, borderRadius = 24, isDark }: Props) {
  const [hasError, setHasError] = useState(false);

  // User recipe with custom photo
  if (imageUri) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius, backgroundColor: categoryColors[category] || '#FED3C7' }, style]}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
          onError={() => setHasError(true)}
        />
        {hasError && <EmojiPlaceholder category={category} isDark={isDark} />}
      </View>
    );
  }

  // User recipe without photo (id starts with "user-") -> app logo
  if (recipeId.startsWith('user-')) {
    return (
      <View style={[{ overflow: 'hidden', borderRadius, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }, style]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={{ width: 64, height: 64, borderRadius: 12 }}
          contentFit="contain"
        />
      </View>
    );
  }

  // Regular recipe with remote image
  const imageUrl = getRecipeImage(recipeId, category);

  return (
    <View style={[{ overflow: 'hidden', borderRadius, backgroundColor: categoryColors[category] || '#FED3C7' }, style]}>
      <Image
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={300}
        onError={() => setHasError(true)}
      />
      {hasError && <EmojiPlaceholder category={category} isDark={isDark} />}
    </View>
  );
}
