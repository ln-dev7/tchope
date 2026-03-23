import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSearch } from '@/hooks/useSearch';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import CategoryChip from '@/components/CategoryChip';
import IngredientItem from '@/components/IngredientItem';
import SearchResultCard from '@/components/SearchResultCard';
import EmptyState from '@/components/EmptyState';
import type { Spiciness } from '@/types';

const POPULAR_INGREDIENTS = ['Plantain', 'Manioc', 'Arachides'];

export default function SearchScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const recipes = useLocalizedRecipes();
  const { bottom } = useSafeAreaInsets();
  const { results, query, setQuery, filters, setFilters } = useSearch(recipes);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }, [])
  );

  const dismissKeyboard = () => Keyboard.dismiss();

  const handleDurationFilter = (duration: 'under30' | '30to60' | 'over60' | undefined) => {
    dismissKeyboard();
    setFilters((prev) => ({
      ...prev,
      duration: prev.duration === duration ? undefined : duration,
    }));
  };

  const handleSpicinessFilter = (spiciness: Spiciness | undefined) => {
    dismissKeyboard();
    setFilters((prev) => ({
      ...prev,
      spiciness: prev.spiciness === spiciness ? undefined : spiciness,
    }));
  };

  const handleIngredientFilter = (ingredient: string) => {
    dismissKeyboard();
    const newIngredient = selectedIngredient === ingredient ? null : ingredient;
    setSelectedIngredient(newIngredient);
    setFilters((prev) => ({
      ...prev,
      ingredient: newIngredient || undefined,
    }));
  };

  const hasActiveFilters = query || filters.duration || filters.spiciness || filters.ingredient;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.accent, letterSpacing: -1.2 }}>
          Tchopé
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 + bottom, gap: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Search Input - same style as home */}
        <View style={{ marginHorizontal: 24, position: 'relative' }}>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="rgba(92,91,91,0.6)"
            style={{
              backgroundColor: colors.inputBg,
              borderRadius: 48,
              paddingLeft: 48,
              paddingRight: query ? 48 : 16,
              paddingVertical: 18,
              fontSize: 16,
              color: colors.text,
            }}
          />
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={{ position: 'absolute', left: 16, top: 20 }}
          />
          {query ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={{ position: 'absolute', right: 16, top: 18, padding: 2 }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Filters */}
        <View style={{ gap: 12, paddingHorizontal: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}>
            <CategoryChip
              label={t('under30')}
              active={filters.duration === 'under30'}
              onPress={() => handleDurationFilter('under30')}
            />
            <CategoryChip
              label={t('between30and60')}
              active={filters.duration === '30to60'}
              onPress={() => handleDurationFilter('30to60')}
            />
            <CategoryChip
              label={t('over60')}
              active={filters.duration === 'over60'}
              onPress={() => handleDurationFilter('over60')}
            />
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}>
            <CategoryChip
              label={t('mild')}
              active={filters.spiciness === 'Mild'}
              onPress={() => handleSpicinessFilter('Mild')}
              variant="green"
            />
            <CategoryChip
              label={t('mediumSpice')}
              active={filters.spiciness === 'Medium'}
              onPress={() => handleSpicinessFilter('Medium')}
            />
            <CategoryChip
              label={t('extraHot')}
              active={filters.spiciness === 'Extra Hot'}
              onPress={() => handleSpicinessFilter('Extra Hot')}
            />
          </ScrollView>
        </View>

        {/* Popular Ingredients */}
        <View style={{ gap: 24, paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.5,
            }}>
            {t('popularIngredients')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {POPULAR_INGREDIENTS.map((ing) => (
              <View key={ing} style={{ width: '30%' }}>
                <IngredientItem
                  name={ing}
                  active={selectedIngredient === ing}
                  onPress={() => handleIngredientFilter(ing)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Results */}
        {hasActiveFilters && (
          <View style={{ gap: 20, paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                {t('results')}{' '}
                <Text style={{ color: colors.accentOrange }}>({results.length})</Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setSelectedIngredient(null);
                  setFilters({});
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
                  {t('reset')}
                </Text>
              </TouchableOpacity>
            </View>

            {results.length > 0 ? (
              <View style={{ gap: 20 }}>
                {results.map((recipe) => (
                  <SearchResultCard key={recipe.id} recipe={recipe} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="search-outline"
                title={t('noResults')}
                subtitle=""
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
