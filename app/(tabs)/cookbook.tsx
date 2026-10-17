import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useNotes } from '@/context/NotesContext';
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
  const { notes } = useNotes();
  const [selectedTab, setActiveTab] = useState<Tab | null>(null);
  const activeTab = selectedTab ?? (userRecipes.length === 0 && favorites.length > 0 ? 'favorites' : 'myRecipes');
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const savedRecipes = useMemo(() => {
    const favRecipes = [...recipes, ...userRecipes].filter((r) => favorites.includes(r.id));
    if (activeFilter === 'all') return favRecipes;
    if (activeFilter === 'breakfast') return favRecipes.filter((r) => r.tags?.includes('Breakfast'));
    if (activeFilter === 'sundayFeast') return favRecipes.filter((r) => r.tags?.includes('Sunday Feast'));
    if (activeFilter === 'starters') return favRecipes.filter((r) => r.category === 'Entrée');
    if (activeFilter === 'sauces') return favRecipes.filter((r) => r.category === 'Sauce');
    return favRecipes;
  }, [favorites, activeFilter, recipes, userRecipes]);

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
          <View style={{ gap: 4, flex: 1 }}>
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
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.9 }}>
              {t('myCookbook')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/add-recipe')}
            accessibilityRole="button" accessibilityLabel={t('addRecipe')}
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
            {userRecipes.length > 0 ? (
              <View style={{ gap: 16 }}>
                {userRecipes.map((recipe) => (
                  <View key={recipe.id} style={{ position: 'relative' }}>
                    <RecipeCard recipe={recipe} titlePaddingRight={80} />
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
              <TouchableOpacity onPress={() => router.push('/notes')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t('myNotes')} · {notes.length}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
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
        <TouchableOpacity onPress={() => router.push('/notes')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t('myNotes')} · {notes.length}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
