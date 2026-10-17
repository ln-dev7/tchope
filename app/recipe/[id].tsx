import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ClipboardModule from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';
import { useShopping } from '@/context/ShoppingContext';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useRating } from '@/context/RatingContext';
import { getRecipeVideos } from '@/constants/videos';
import RecipeImage from '@/components/RecipeImage';
import { scaleQuantity } from '@/utils/quantity';

type Tab = 'ingredients' | 'steps';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const { addRecipe: addShoppingRecipe, isLoaded: shoppingLoaded } = useShopping();
  const { userRecipes } = useUserRecipes();
  const { trackRecipeView } = useRating();
  const recipes = useLocalizedRecipes();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState<number | null>(null);

  const recipe = useMemo(() => {
    return recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);
  }, [id, userRecipes, recipes]);

  useEffect(() => {
    if (recipe) trackRecipeView();
  }, [recipe, trackRecipeView]);

  const currentServings = servings ?? recipe?.servings ?? 1;
  const portionRatio = recipe ? currentServings / recipe.servings : 1;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: scaleQuantity(ing.quantity, portionRatio),
    }));
  }, [recipe, portionRatio]);

  const adjustServings = useCallback((delta: number) => {
    const base = servings ?? recipe?.servings ?? 1;
    const next = Math.max(1, base + delta);
    setServings(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [servings, recipe?.servings]);

  if (!recipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Recipe not found</Text>
      </SafeAreaView>
    );
  }

  const handleFavorite = () => {
    const wasFav = isFavorite(recipe.id);
    toggleFavorite(recipe.id);
    toast(wasFav ? t('favoriteRemoved') : t('favoriteAdded'), wasFav ? 'custom' : 'heart');
  };

  const buildRecipeText = (): string => {
    let text = `🍽️ ${recipe.name}\n`;
    text += `📍 ${recipe.region} | ⏱️ ${recipe.duration} min | 👥 ${recipe.servings} pers.\n\n`;
    text += `📝 ${recipe.description}\n\n`;
    text += `🛒 INGRÉDIENTS\n`;
    recipe.ingredients.forEach((ing) => {
      text += `  • ${ing.name} — ${ing.quantity}\n`;
    });
    text += `\n👨‍🍳 PRÉPARATION\n`;
    recipe.steps.forEach((step, i) => {
      text += `  ${i + 1}. ${step}\n`;
    });
    if (recipe.tips) {
      text += `\n💡 ASTUCE DU CHEF\n${recipe.tips}\n`;
    }
    const videos = getRecipeVideos(recipe.id);
    if (videos && videos.length > 0) {
      text += `\n🎥 VIDÉOS\n`;
      videos.forEach((v) => {
        text += `  ▶ ${v.title}\n    https://youtube.com/watch?v=${v.id}\n`;
      });
    }
    text += `\n— Partagé via Tchopé 🇨🇲 by https://tchope.lndev.me`;
    return text;
  };

  const handleShare = async () => {
    const text = buildRecipeText();
    try {
      const result = await Share.share({ message: text });
      if (result.action === Share.sharedAction) {
        toast('Recette partagée', 'done');
      }
    } catch {
      // Copy to clipboard as fallback
      ClipboardModule.setStringAsync(text);
      toast('Recette copiée', 'done');
    }
  };

  const handleStartCooking = () => {
    // Timer global commenté — le timer est maintenant intégré aux étapes de cuisine
    // startTimer(recipe.id, recipe.name, recipe.duration);
    router.push(`/cooking-mode?id=${recipe.id}` as any);
  };

  const isUserCreated = userRecipes.some((r) => r.id === recipe.id);

  const difficultyLabel =
    recipe.difficulty === 'Easy' ? t('easy') : recipe.difficulty === 'Hard' ? t('hard') : t('medium');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 + bottom }} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={{ height: 260, overflow: 'hidden' }}>
          <RecipeImage recipeId={recipe.id} category={recipe.category} imageUri={(recipe as any).imageUri} isDark={isDark} style={{ width: '100%', height: '100%' }} borderRadius={0} />
          {/* Back + Share buttons */}
          <SafeAreaView
            edges={['top']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingVertical: 16,
            }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : 'rgba(255,255,255,0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="arrow-back" size={20} color={isDark ? '#F5F5F5' : '#2F2F2E'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDark ? 'rgba(26,26,26,0.8)' : 'rgba(255,255,255,0.9)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="share-outline" size={20} color={isDark ? '#F5F5F5' : '#2F2F2E'} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content Card */}
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            marginTop: -24,
            paddingTop: 20,
            paddingHorizontal: 24,
          }}>
          {/* Title + Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.7, flex: 1 }}>
              {recipe.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isUserCreated && (
                <TouchableOpacity
                  onPress={() => router.push(`/add-recipe?edit=${recipe.id}` as any)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: isDark ? 'rgba(175,173,172,0.15)' : 'rgba(175,173,172,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="pencil-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleFavorite}
                accessibilityRole="button" accessibilityLabel={t(isFavorite(recipe.id) ? 'removeFavorite' : 'addFavorite')}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                }}>
                <Ionicons
                  name={isFavorite(recipe.id) ? 'heart' : 'heart-outline'}
                  size={25}
                  color={isFavorite(recipe.id) ? '#E74C3C' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>◷ {recipe.duration} min</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{difficultyLabel} · {recipe.region}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '600', flexGrow: 1 }}>{t('portions')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('decreaseServings')} disabled={currentServings <= 1} onPress={() => adjustServings(-1)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="remove" size={20} color={currentServings <= 1 ? colors.textMuted : colors.accent} /></TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{currentServings}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('increaseServings')} onPress={() => adjustServings(1)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={20} color={colors.accent} /></TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View
            style={{
              backgroundColor: isDark ? '#3A3A3A' : '#E4E2E1',
              borderRadius: 9999,
              padding: 6,
              flexDirection: 'row',
              marginTop: 20,
            }}>
            <TouchableOpacity
              onPress={() => setActiveTab('ingredients')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 9999,
                backgroundColor: activeTab === 'ingredients' ? (isDark ? colors.card : colors.chipActiveText) : 'transparent',
                alignItems: 'center',
                ...(activeTab === 'ingredients'
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                  : {}),
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: activeTab === 'ingredients' ? '700' : '500',
                  color: activeTab === 'ingredients' ? colors.accent : colors.textSecondary,
                }}>
                {t('ingredients')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('steps')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 9999,
                backgroundColor: activeTab === 'steps' ? (isDark ? colors.card : colors.chipActiveText) : 'transparent',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: activeTab === 'steps' ? '700' : '500',
                  color: activeTab === 'steps' ? colors.accent : colors.textSecondary,
                }}>
                {t('steps')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'ingredients' ? (
            <View style={{ marginTop: 24, gap: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
                  {t('ingredients')}
                </Text>
                <View style={{ backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {scaledIngredients.length} {t('items')}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {scaledIngredients.map((ing, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: isDark ? colors.card : colors.chipActiveText,
                      borderRadius: 18,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.ingredientBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16,
                      }}>
                      <Ionicons name="nutrition-outline" size={16} color={colors.accent} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: colors.text }}>
                      {ing.name}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent, maxWidth: '40%', flexShrink: 1, textAlign: 'right', marginLeft: 8 }}>
                      {ing.quantity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 24, gap: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
                {t('steps')}
              </Text>
              <View style={{ gap: 24 }}>
                {recipe.steps.map((step, index) => (
                  <View key={index} style={{ flexDirection: 'row', gap: 24 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.chipActiveText }}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingTop: 8 }}>
                      <Text style={{ fontSize: 16, color: colors.textSecondary, lineHeight: 26 }}>
                        {step}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 10, marginTop: 24 }}>
            <TouchableOpacity disabled={!shoppingLoaded} onPress={() => { addShoppingRecipe(recipe.id, currentServings); toast(t('addedToShopping'), 'done'); router.push('/shopping-list'); }} style={{ padding: 16, borderRadius: 18, backgroundColor: colors.surface, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="cart-outline" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', flex: 1 }}>{t('addToShopping')}</Text><Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname: '/plan-meal', params: { recipeId: recipe.id, servings: String(currentServings) } })} style={{ padding: 16, borderRadius: 18, backgroundColor: colors.surface, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={22} color={colors.accent} /><Text style={{ color: colors.accent, fontWeight: '700', flex: 1 }}>{t('planRecipe')}</Text><Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/live-cooking?id=${recipe.id}` as any)} style={{ padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="mic-outline" size={22} color={colors.accent} /><Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{t('voiceGuide')}</Text>
            </TouchableOpacity>
            {!!getRecipeVideos(recipe.id)?.length && <TouchableOpacity onPress={() => router.push(`/recipe-videos?id=${recipe.id}&name=${encodeURIComponent(recipe.name)}` as any)} style={{ padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="logo-youtube" size={22} color={colors.accent} /><Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{t('videoRecipe')}</Text>
            </TouchableOpacity>}
          </View>
          {/* Chef's Tips */}
          {recipe.tips && (
            <View
              style={{
                marginTop: 32,
                backgroundColor: isDark ? 'rgba(157,248,152,0.1)' : 'rgba(157,248,152,0.3)',
                borderLeftWidth: 8,
                borderLeftColor: colors.green,
                borderRadius: 48,
                paddingLeft: 40,
                paddingRight: 32,
                paddingVertical: 32,
                gap: 16,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="bulb-outline" size={22} color={colors.greenText} />
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.greenText }}>
                  {t('chefTips')}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.greenText, lineHeight: 26 }}>
                {recipe.tips}
              </Text>
            </View>
          )}

        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 + bottom, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <TouchableOpacity accessibilityRole="button" onPress={handleStartCooking} style={{ padding: 16, backgroundColor: colors.accent, borderRadius: 18, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-circle-outline" size={22} color={colors.chipActiveText} /><Text style={{ color: colors.chipActiveText, fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{t('startCooking')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
