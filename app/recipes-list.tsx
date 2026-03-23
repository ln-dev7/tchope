import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import RecipeCard from '@/components/RecipeCard';
import type { Region } from '@/types';

export default function RecipesListScreen() {
  const { region, title } = useLocalSearchParams<{ region?: string; title?: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const recipes = useLocalizedRecipes();
  const [query, setQuery] = useState('');

  const filteredRecipes = useMemo(() => {
    let list = region
      ? recipes.filter((r) => r.region === region)
      : recipes;

    if (query.trim()) {
      const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      list = list.filter((r) => {
        const searchable = [r.name, r.description, r.region, ...r.ingredients.map((i) => i.name)].join(' ');
        return searchable.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [region, query]);

  const screenTitle = title || (region ? `${region}` : t('allRecipes'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
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
          placeholderTextColor="rgba(92,91,91,0.6)"
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
