import { fixedColors } from "@/constants/themes";
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/context/UserRecipesContext';
import RecipeCard from '@/components/RecipeCard';
import type { Region, Recipe } from '@/types';
import { photosFirst } from '@/constants/images';

export default function RecipesListScreen() {
  const { region, title } = useLocalSearchParams<{ region?: string; title?: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  const [query, setQuery] = useState('');

  const allRecipes = useMemo(
    () => [...recipes, ...userRecipes] as Recipe[],
    [recipes, userRecipes],
  );

  const filteredRecipes = useMemo(() => {
    let list = region
      ? allRecipes.filter((r) => r.region === region)
      : allRecipes;

    if (query.trim()) {
      const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      list = list.filter((r) => {
        const searchable = [r.name, r.description, r.region, ...r.ingredients.map((i) => i.name)].join(' ');
        return searchable.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      });
    }

    // Ordre alphabétique, mais les plats sans photo fiable toujours à la fin.
    return photosFirst([...list].sort((a, b) => a.name.localeCompare(b.name)));
  }, [allRecipes, region, query]);

  const screenTitle = title || (region ? `${region}` : t('allRecipes'));

  return (
    <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 840, alignSelf: 'center', backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {screenTitle}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {filteredRecipes.length} {t('recipes').toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 24, marginBottom: 16, position: 'relative' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={fixedColors.legacyPlaceholder}
          style={{
            backgroundColor: colors.inputBg,
            borderRadius: 24,
            paddingLeft: 48,
            paddingRight: 16,
            paddingVertical: 16,
            fontSize: 16,
            color: colors.text,
          }}
        />
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.textSecondary}
          style={{ position: 'absolute', left: 40, top: 18 }}
        />
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 + bottom, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
        {filteredRecipes.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16 }}>
              {t('noResults')}
            </Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}
