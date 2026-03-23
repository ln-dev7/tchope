import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import RecipeGridCard from '@/components/RecipeGridCard';
import RecipeCard from '@/components/RecipeCard';
import CategoryChip from '@/components/CategoryChip';
import EmptyState from '@/components/EmptyState';

type Tab = 'myRecipes' | 'favorites';
type Filter = 'all' | 'breakfast' | 'sundayFeast' | 'starters' | 'sauces';

export default function CookbookScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const recipes = useLocalizedRecipes();
  const { favorites } = useFavorites();
  const { userRecipes, deleteRecipe } = useUserRecipes();
  const [activeTab, setActiveTab] = useState<Tab>('myRecipes');
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const savedRecipes = useMemo(() => {
    const favRecipes = recipes.filter((r) => favorites.includes(r.id));
    if (activeFilter === 'all') return favRecipes;
    if (activeFilter === 'breakfast') return favRecipes.filter((r) => r.tags?.includes('Breakfast'));
    if (activeFilter === 'sundayFeast') return favRecipes.filter((r) => r.tags?.includes('Sunday Feast'));
    if (activeFilter === 'starters') return favRecipes.filter((r) => r.category === 'Entrée');
    if (activeFilter === 'sauces') return favRecipes.filter((r) => r.category === 'Sauce');
    return favRecipes;
  }, [favorites, activeFilter]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'breakfast', label: t('breakfast') },
    { key: 'sundayFeast', label: t('sundayFeast') },
    { key: 'starters', label: t('starters') },
    { key: 'sauces', label: t('sauces') },
  ];

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
        contentContainerStyle={{ paddingBottom: 80 + bottom, paddingHorizontal: 24, gap: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Title + Add button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}>
              {t('personalSpace')}
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.9 }}>
              {t('myCookbook')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/add-recipe')}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 32,
            padding: 6,
            flexDirection: 'row',
          }}>
          <TouchableOpacity
            onPress={() => setActiveTab('myRecipes')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 32,
              backgroundColor: activeTab === 'myRecipes' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
              alignItems: 'center',
              ...(activeTab === 'myRecipes'
                ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                : {}),
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'myRecipes' ? colors.accent : colors.textSecondary,
              }}>
              {t('myRecipes')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('favorites')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 32,
              backgroundColor: activeTab === 'favorites' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'favorites' ? colors.accent : colors.textSecondary,
              }}>
              {t('favorites')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'myRecipes' ? (
          /* Mes Recettes */
          <View style={{ gap: 20 }}>
            {/* Create button */}
            <TouchableOpacity
              onPress={() => router.push('/add-recipe')}
              activeOpacity={0.8}
              style={{
                backgroundColor: isDark ? 'rgba(145,71,0,0.1)' : 'rgba(145,71,0,0.06)',
                borderRadius: 24,
                borderWidth: 2,
                borderColor: isDark ? 'rgba(145,71,0,0.2)' : 'rgba(145,71,0,0.12)',
                borderStyle: 'dashed',
                paddingVertical: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {t('addRecipe')}
              </Text>
            </TouchableOpacity>

            {userRecipes.length > 0 ? (
              <View style={{ gap: 16 }}>
                {userRecipes.map((recipe) => (
                  <View key={recipe.id} style={{ position: 'relative' }}>
                    <RecipeCard recipe={recipe} />
                    <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => router.push(`/add-recipe?edit=${recipe.id}` as any)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isDark ? 'rgba(145,71,0,0.15)' : 'rgba(145,71,0,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="pencil-outline" size={14} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            t('clearConfirm'),
                            t('clearConfirmMessage'),
                            [
                              { text: t('cancel'), style: 'cancel' },
                              { text: t('confirm'), style: 'destructive', onPress: () => deleteRecipe(recipe.id) },
                            ]
                          );
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: 'rgba(231,76,60,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="create-outline"
                title={t('noUserRecipes')}
                subtitle={t('noUserRecipesSubtitle')}
              />
            )}
          </View>
        ) : (
          /* Mes Favoris */
          <>
            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}>
              {filters.map((f) => (
                <CategoryChip
                  key={f.key}
                  label={f.label}
                  active={activeFilter === f.key}
                  onPress={() => setActiveFilter(f.key)}
                  variant={activeFilter === f.key ? 'default' : 'peach'}
                />
              ))}
            </ScrollView>

            {/* Grid */}
            {savedRecipes.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {savedRecipes.map((recipe) => (
                  <RecipeGridCard key={recipe.id} recipe={recipe} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="heart-outline"
                title={t('noFavorites')}
                subtitle={t('noFavoritesSubtitle')}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
