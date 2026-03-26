import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Keyboard, LayoutAnimation, Platform, UIManager } from 'react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const recipes = useLocalizedRecipes();
  const { bottom } = useSafeAreaInsets();
  const { results, query, setQuery, filters, setFilters } = useSearch(recipes);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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

        {/* Quick Filters - hidden when search is active */}
        {!hasActiveFilters && (
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
        )}

        {/* Popular Ingredients - hidden when search is active */}
        {!hasActiveFilters && (
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
        )}

        {/* Results */}
        {hasActiveFilters && (
          <View style={{ gap: 20, paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                {t('results')}{' '}
                <Text style={{ color: colors.accentOrange }}>({results.length})</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowFilters((prev) => !prev);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: showFilters ? colors.accent : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Ionicons name="options-outline" size={14} color={showFilters ? '#FFFFFF' : colors.accent} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: showFilters ? '#FFFFFF' : colors.accent }}>
                    {t('filter')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setSelectedIngredient(null);
                    setFilters({});
                    setShowFilters(false);
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
            </View>

            {/* Active filters chips */}
            {(filters.duration || filters.spiciness || selectedIngredient) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {query ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Ionicons name="search-outline" size={13} color={colors.accent} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }} numberOfLines={1}>&quot;{query}&quot;</Text>
                  </View>
                ) : null}
                {filters.duration && (
                  <TouchableOpacity
                    onPress={() => handleDurationFilter(filters.duration)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Ionicons name="time-outline" size={13} color={colors.accent} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
                      {filters.duration === 'under30' ? t('under30') : filters.duration === '30to60' ? t('between30and60') : t('over60')}
                    </Text>
                    <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                {filters.spiciness && (
                  <TouchableOpacity
                    onPress={() => handleSpicinessFilter(filters.spiciness)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Ionicons name="flame-outline" size={13} color={colors.accent} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
                      {filters.spiciness === 'Mild' ? t('mild') : filters.spiciness === 'Medium' ? t('mediumSpice') : t('extraHot')}
                    </Text>
                    <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                {selectedIngredient && (
                  <TouchableOpacity
                    onPress={() => handleIngredientFilter(selectedIngredient)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Ionicons name="nutrition-outline" size={13} color={colors.accent} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{selectedIngredient}</Text>
                    <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Expandable filter panel */}
            {showFilters && (
              <View
                style={{
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  borderRadius: 24,
                  padding: 16,
                  gap: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                {/* Duration */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('cookingTime')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {([['under30', 'under30'], ['30to60', 'between30and60'], ['over60', 'over60']] as const).map(([key, label]) => {
                      const active = filters.duration === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => handleDurationFilter(key)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            backgroundColor: active ? colors.chipActiveBg : colors.surface,
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: active ? '600' : '500', color: active ? colors.chipActiveText : colors.textMuted }}>
                            {t(label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Spiciness */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('spicinessLevel')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {([['Mild', 'mild'], ['Medium', 'mediumSpice'], ['Extra Hot', 'extraHot']] as const).map(([key, label]) => {
                      const active = filters.spiciness === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => handleSpicinessFilter(key)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            backgroundColor: active ? colors.chipActiveBg : colors.surface,
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: active ? '600' : '500', color: active ? colors.chipActiveText : colors.textMuted }}>
                            {t(label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Ingredients */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('popularIngredients')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {POPULAR_INGREDIENTS.map((ing) => {
                      const active = selectedIngredient === ing;
                      return (
                        <TouchableOpacity
                          key={ing}
                          onPress={() => handleIngredientFilter(ing)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            backgroundColor: active ? colors.chipActiveBg : colors.surface,
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: active ? '600' : '500', color: active ? colors.chipActiveText : colors.textMuted }}>
                            {ing}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

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
