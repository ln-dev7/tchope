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
import PageIntro from '@/components/ui/PageIntro';
import EmptyState from '@/components/EmptyState';

type Tab = 'myRecipes' | 'favorites';
type Filter = 'all' | 'breakfast' | 'sundayFeast' | 'starters' | 'sauces';

export default function CookbookScreen() {
  const { colors } = useTheme();
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
    <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 840, alignSelf: 'center', backgroundColor: colors.background }} edges={['top']}>
      <PageIntro title={t('myCookbook')} subtitle={t('cookbookSubtitle')} action={
        <TouchableOpacity onPress={() => router.push('/add-recipe')} accessibilityRole="button" accessibilityLabel={t('addRecipe')}
          style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={25} color={colors.onAccent} />
        </TouchableOpacity>
      } />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 112 + bottom, paddingHorizontal: 24, gap: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 4,
            flexDirection: 'row',
          }}>
          <TouchableOpacity
            accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'myRecipes' }} onPress={() => setActiveTab('myRecipes')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: activeTab === 'myRecipes' ? (colors.card) : 'transparent',
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
            accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'favorites' }} onPress={() => setActiveTab('favorites')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: activeTab === 'favorites' ? (colors.card) : 'transparent',
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
                    <RecipeCard recipe={recipe} />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel={`${t('editRecipe')} · ${recipe.name}`} onPress={() => router.push(`/add-recipe?edit=${recipe.id}` as any)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 16,
                          backgroundColor: colors.accentSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="pencil-outline" size={14} color={colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel={`${t('delete')} · ${recipe.name}`}
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
                          width: 44,
                          height: 44,
                          borderRadius: 16,
                          backgroundColor: colors.dangerSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
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
        <TouchableOpacity onPress={() => router.push('/notes')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t('myNotes')} · {notes.length}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
