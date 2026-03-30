import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useSettings } from '@/context/SettingsContext';
import { useMealPlanner, type MealPlan, type DayPlan, type MealSlot } from '@/context/MealPlannerContext';
import { useToast } from '@/hooks/useToast';
import { getRecipeImage } from '@/constants/images';
import type { Recipe } from '@/types';

const API_KEY = process.env.EXPO_PUBLIC_TCHOPE_SECRET_KEY;

const FULL_DAY_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FULL_DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const SHORT_DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  const d = new Date(dateStr + 'T12:00:00');
  const names = lang === 'fr' ? FULL_DAY_FR : FULL_DAY_EN;
  const month = d.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });
  return `${names[d.getDay()]} ${d.getDate()} ${month}`;
}

function shortDay(dateStr: string, lang: 'fr' | 'en'): string {
  const d = new Date(dateStr + 'T12:00:00');
  return (lang === 'fr' ? SHORT_DAY_FR : SHORT_DAY_EN)[d.getDay()];
}

function buildRecipeIndex(recipes: Recipe[]): string {
  return recipes
    .map((r) => `${r.id}|${r.name}|${r.category}|${r.region}|${r.duration}min|${r.difficulty}|${r.spiciness}`)
    .join('\n');
}

// ── AI: Generate plan ──────────────────────────────────────────

async function generateMealPlanAI(
  recipes: Recipe[],
  preferences: string,
  days: string[],
  isFr: boolean,
): Promise<Record<string, DayPlan>> {
  if (!API_KEY) throw new Error('No API key');

  const recipeList = buildRecipeIndex(recipes);
  const lang = isFr ? 'fr' : 'en';
  const dayLabels = days.map((d) => `${d} (${formatDate(d, lang)})`).join(', ');

  const systemPrompt = `You are a Cameroonian meal planner. Create a weekly meal plan using ONLY recipe IDs from the provided list.

CRITICAL: Respect the user's preferences for NUMBER OF MEALS per day. If they ask for 3 meals, give 3. If they ask for 2 on weekends, give 2 on weekends. Default is 2 (lunch + dinner) if not specified.

Meal labels to use (in ${isFr ? 'French' : 'English'}):
- Breakfast: "${isFr ? 'Petit-déj' : 'Breakfast'}"
- Lunch: "${isFr ? 'Déjeuner' : 'Lunch'}"
- Dinner: "${isFr ? 'Dîner' : 'Dinner'}"

Rules:
- Vary recipes: never repeat the same dish twice in the week
- Balance regions and categories
- Light meals for breakfast/lunch, heartier for dinner
- Match user preferences (regions, dietary needs, meal counts)

Days: ${dayLabels}

Return ONLY valid JSON (no markdown), format:
{
  "YYYY-MM-DD": { "meals": [{"label": "Déjeuner", "recipeId": "id"}, {"label": "Dîner", "recipeId": "id"}] },
  ...
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Recipe list:\n${recipeList}\n\nPreferences: ${preferences || 'No specific preferences. 2 meals per day (lunch + dinner), balanced and varied.'}` }],
    }),
  });

  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response');
  return JSON.parse(jsonMatch[0]);
}

// ── AI: Adjust plan ──────────────────────────────────────────

async function adjustMealPlanAI(
  recipes: Recipe[],
  currentPlan: MealPlan,
  adjustmentRequest: string,
  isFr: boolean,
): Promise<Record<string, DayPlan>> {
  if (!API_KEY) throw new Error('No API key');

  const recipeList = buildRecipeIndex(recipes);
  const lang = isFr ? 'fr' : 'en';

  // Serialize current plan for context
  const currentPlanStr = Object.entries(currentPlan.days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => {
      const meals = day.meals.map((m) => `${m.label}: ${m.recipeId}`).join(', ');
      return `${date} (${formatDate(date, lang)}): ${meals}`;
    })
    .join('\n');

  const systemPrompt = `You are a Cameroonian meal planner. The user has an existing plan and wants to ADJUST it. Only change what the user asks for, keep everything else the same.

Meal labels (${isFr ? 'French' : 'English'}):
- "${isFr ? 'Petit-déj' : 'Breakfast'}", "${isFr ? 'Déjeuner' : 'Lunch'}", "${isFr ? 'Dîner' : 'Dinner'}"

You can: swap recipes, add meals to a day, remove meals from a day, change entire days.
Keep unchanged days exactly as they are.

Return the FULL updated plan as valid JSON (no markdown), same format:
{
  "YYYY-MM-DD": { "meals": [{"label": "...", "recipeId": "id"}, ...] },
  ...
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Available recipes:\n${recipeList}\n\nCurrent plan:\n${currentPlanStr}\n\nAdjustment requested: ${adjustmentRequest}` }],
    }),
  });

  if (!response.ok) throw new Error('API error');
  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response');
  return JSON.parse(jsonMatch[0]);
}

// ── Meal Card ──────────────────────────────────────────

function MealCard({
  recipe, label, colors, onSwap, onPress,
}: {
  recipe: Recipe | undefined;
  label: string;
  colors: any;
  onSwap: () => void;
  onPress: () => void;
}) {
  if (!recipe) return null;
  const imageUrl = getRecipeImage(recipe.id, recipe.category);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Image source={{ uri: imageUrl }} style={{ width: 80, height: 80 }} contentFit="cover" />
        <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.accent, textTransform: 'uppercase' }}>
            {label}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 }} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {recipe.region} · {recipe.duration} min
          </Text>
        </View>
        <TouchableOpacity onPress={onSwap} style={{ padding: 12, justifyContent: 'center' }}>
          <Ionicons name="shuffle-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────

export default function PlannerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const router = useRouter();
  const recipes = useLocalizedRecipes();
  const { bottom } = useSafeAreaInsets();
  const { toast } = useToast();
  const {
    currentPlan, savedPlans, setCurrentPlan,
    savePlan, deleteSavedPlan, reusePlan, resetPlan, swapMeal,
  } = useMealPlanner();

  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const recipeMap = useMemo(() => {
    const map: Record<string, Recipe> = {};
    recipes.forEach((r) => { map[r.id] = r; });
    return map;
  }, [recipes]);

  const handleGenerate = useCallback(async () => {
    if (!API_KEY) { Alert.alert('Tchopé', t('plannerNoConnection')); return; }
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const today = new Date();
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
      }
      const result = await generateMealPlanAI(recipes, preferences, days, settings.language === 'fr');
      const plan: MealPlan = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        startDate: days[0],
        endDate: days[6],
        preferences,
        days: result,
        createdAt: new Date().toISOString(),
      };
      setCurrentPlan(plan);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Tchopé', t('plannerError'));
    } finally {
      setIsGenerating(false);
    }
  }, [preferences, recipes, settings.language, setCurrentPlan, t]);

  const handleAdjust = useCallback(async () => {
    if (!currentPlan || !adjustText.trim() || !API_KEY) return;
    setIsAdjusting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await adjustMealPlanAI(recipes, currentPlan, adjustText, settings.language === 'fr');
      setCurrentPlan({ ...currentPlan, days: result });
      setAdjustText('');
      setShowAdjust(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Tchopé', t('plannerError'));
    } finally {
      setIsAdjusting(false);
    }
  }, [currentPlan, adjustText, recipes, settings.language, setCurrentPlan, t]);

  const handleSwap = useCallback((date: string, mealIndex: number) => {
    const current = currentPlan?.days[date]?.meals[mealIndex]?.recipeId;
    const allIds = recipes.map((r) => r.id).filter((id) => id !== current);
    const randomId = allIds[Math.floor(Math.random() * allIds.length)];
    swapMeal(date, mealIndex, randomId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentPlan, recipes, swapMeal]);

  const handleSave = useCallback(() => {
    savePlan();
    toast(t('plannerSaved'), 'done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [savePlan, toast, t]);

  const handleReset = useCallback(() => {
    Alert.alert(t('plannerReset'), t('clearConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirm'), style: 'destructive', onPress: () => { resetPlan(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  }, [resetPlan, t]);

  const handleDeleteSaved = useCallback((planId: string) => {
    Alert.alert(t('plannerDelete'), t('clearConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirm'), style: 'destructive', onPress: () => { deleteSavedPlan(planId); toast(t('plannerPlanDeleted'), 'done'); } },
    ]);
  }, [deleteSavedPlan, toast, t]);

  const handleShoppingList = useCallback(() => {
    router.push('/shopping-list' as any);
  }, [router]);

  const sortedDays = useMemo(() => {
    if (!currentPlan) return [];
    return Object.keys(currentPlan.days).sort();
  }, [currentPlan]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 80 + bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -1.2 }}>
              {t('plannerTitle')}
            </Text>
          </View>

          {currentPlan ? (
            <View style={{ paddingHorizontal: 24 }}>
              {/* Period badge */}
              <View style={{ backgroundColor: colors.accent + '10', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent, marginLeft: 8 }}>
                  {formatDate(currentPlan.startDate, settings.language)} → {formatDate(currentPlan.endDate, settings.language)}
                </Text>
              </View>

              {/* Days */}
              {sortedDays.map((date) => {
                const day = currentPlan.days[date];
                if (!day) return null;

                return (
                  <View key={date} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                          {shortDay(date, settings.language)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: 12 }}>
                        {formatDate(date, settings.language)}
                      </Text>
                    </View>

                    <View style={{ gap: 8, marginLeft: 52 }}>
                      {day.meals.map((meal, idx) => (
                        <MealCard
                          key={`${date}-${idx}`}
                          recipe={recipeMap[meal.recipeId]}
                          label={meal.label}
                          colors={colors}
                          onSwap={() => handleSwap(date, idx)}
                          onPress={() => recipeMap[meal.recipeId] && router.push(`/recipe/${meal.recipeId}` as any)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Adjust section */}
              <TouchableOpacity
                onPress={() => setShowAdjust(!showAdjust)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(168,85,247,0.08)',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(168,85,247,0.15)',
                }}>
                <Ionicons name="sparkles" size={18} color="#A855F7" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#A855F7' }}>
                  {t('plannerAdjust')}
                </Text>
                <Ionicons name={showAdjust ? 'chevron-up' : 'chevron-down'} size={16} color="#A855F7" />
              </TouchableOpacity>

              {showAdjust && (
                <View style={{ marginTop: 10 }}>
                  <TextInput
                    value={adjustText}
                    onChangeText={setAdjustText}
                    placeholder={t('plannerAdjustPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      padding: 14,
                      fontSize: 14,
                      color: colors.text,
                      minHeight: 80,
                      textAlignVertical: 'top',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAdjust}
                    disabled={isAdjusting || !adjustText.trim()}
                    style={{
                      backgroundColor: '#A855F7',
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 8,
                      opacity: isAdjusting || !adjustText.trim() ? 0.6 : 1,
                    }}>
                    {isAdjusting ? (
                      <>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{t('plannerAdjusting')}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{t('plannerAdjust')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={handleShoppingList}
                  style={{ backgroundColor: colors.accent, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{t('plannerShoppingList')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={{ backgroundColor: colors.green + '15', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.green} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.green }}>{t('plannerSave')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReset}
                  style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMuted }}>{t('plannerReset')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* No plan — generation form */
            <View style={{ paddingHorizontal: 24 }}>
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Ionicons name="restaurant-outline" size={36} color={colors.accent} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                  {t('plannerEmptyState')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                  {t('plannerEmptyStateSubtitle')}
                </Text>
              </View>

              <TextInput
                value={preferences}
                onChangeText={setPreferences}
                placeholder={t('plannerDescribePlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                style={{
                  backgroundColor: colors.surface, borderRadius: 16, padding: 16, fontSize: 14, color: colors.text,
                  minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border,
                }}
              />

              <TouchableOpacity
                onPress={handleGenerate}
                disabled={isGenerating}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.accent, borderRadius: 16, padding: 18,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  marginTop: 16, opacity: isGenerating ? 0.7 : 1,
                }}>
                {isGenerating ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{t('plannerGenerating')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{t('plannerGenerate')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Saved Plans */}
          {savedPlans.length > 0 && (
            <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
              <TouchableOpacity onPress={() => setShowSaved(!showSaved)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{t('plannerSavedPlans')}</Text>
                <View style={{ backgroundColor: colors.accent + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{savedPlans.length}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Ionicons name={showSaved ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {showSaved && (
                <View style={{ gap: 10, marginTop: 12 }}>
                  {savedPlans.map((plan) => (
                    <View key={plan.id} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                        {formatDate(plan.startDate, settings.language)} → {formatDate(plan.endDate, settings.language)}
                      </Text>
                      {plan.preferences ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>{plan.preferences}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => reusePlan(plan)}
                          style={{ flex: 1, backgroundColor: colors.accent + '12', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{t('plannerReuse')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSaved(plan.id)}
                          style={{ backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: 10, padding: 10, paddingHorizontal: 16, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>{t('plannerDelete')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
