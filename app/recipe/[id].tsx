import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share } from 'react-native';
import * as ClipboardModule from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/useToast';
import { useTimer } from '@/context/TimerContext';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { getRecipeVideos } from '@/constants/videos';
import RecipeImage from '@/components/RecipeImage';

type Tab = 'ingredients' | 'steps';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const { startTimer, isTimerRunning } = useTimer();
  const { userRecipes } = useUserRecipes();
  const recipes = useLocalizedRecipes();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');

  const recipe = useMemo(() => {
    return recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);
  }, [id, userRecipes, recipes]);

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
    toast(wasFav ? 'Retiré des favoris' : 'Ajouté aux favoris', wasFav ? 'custom' : 'heart');
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
    startTimer(recipe.name, recipe.duration);
    toast(`Timer lancé : ${recipe.duration} min`, 'done');
  };

  const isUserCreated = userRecipes.some((r) => r.id === recipe.id);

  const difficultyLabel =
    recipe.difficulty === 'Easy' ? t('easy') : recipe.difficulty === 'Hard' ? t('hard') : t('medium');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 + bottom }} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={{ height: 350, overflow: 'hidden' }}>
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
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            marginTop: -48,
            paddingTop: 32,
            paddingHorizontal: 24,
          }}>
          {/* Title + Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1.8, flex: 1 }}>
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

          {/* Meta Bento Grid */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 32, padding: 16, alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={20} color={colors.accentOrange} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' }}>
                {t('prepTime')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {recipe.duration} min
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 32, padding: 16, alignItems: 'center', gap: 4 }}>
              <Ionicons name="speedometer-outline" size={20} color={colors.accentOrange} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' }}>
                {t('difficulty')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {difficultyLabel}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 32, padding: 16, alignItems: 'center', gap: 4 }}>
              <Ionicons name="people-outline" size={20} color={colors.accentOrange} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' }}>
                {t('portions')}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                {recipe.servings} {t('persons')}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 12, marginTop: 24 }}>
            {getRecipeVideos(recipe.id) && (
              <TouchableOpacity
                onPress={() => router.push(`/recipe-videos?id=${recipe.id}&name=${encodeURIComponent(recipe.name)}` as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: isDark ? 'rgba(255,0,0,0.08)' : 'rgba(255,0,0,0.05)',
                  borderRadius: 20,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255,0,0,0.2)' : 'rgba(255,0,0,0.15)',
                }}>
                <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {t('videoRecipe')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleStartCooking}
              disabled={isTimerRunning}
              activeOpacity={0.85}
              style={{
                backgroundColor: isTimerRunning ? colors.surface : colors.accent,
                borderRadius: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Ionicons
                name={isTimerRunning ? 'timer-outline' : 'play-circle-outline'}
                size={18}
                color={isTimerRunning ? colors.textMuted : '#FFFFFF'}
              />
              <Text style={{ fontSize: 14, fontWeight: '700', color: isTimerRunning ? colors.textMuted : '#FFFFFF' }}>
                {isTimerRunning ? 'Timer...' : t('startCooking')}
              </Text>
            </TouchableOpacity>
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
                backgroundColor: activeTab === 'ingredients' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
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
                backgroundColor: activeTab === 'steps' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
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
                  {t('shoppingList')}
                </Text>
                <View style={{ backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    {recipe.ingredients.length} {t('items')}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {recipe.ingredients.map((ing, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderRadius: 32,
                      padding: 16,
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
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
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
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>
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
    </View>
  );
}
