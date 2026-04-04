import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useSettings } from '@/context/SettingsContext';
import RecipeCard from '@/components/RecipeCard';
import { searchByIngredients, isValidIngredient, getMissingIngredients } from '@/utils/ingredient-matcher';
import { callClaude } from '@/utils/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLicense } from '@/context/LicenseContext';
import type { Recipe } from '@/types';

type SearchResult = {
  id: string;
  match: number;
  reason: string;
};

type Mode = 'ingredients' | 'free';

// ── AI search by ingredients ────────────────────────────────────────────

async function searchIngredientsAI(
  recipes: Recipe[],
  userIngredients: string[],
  isFr: boolean,
): Promise<SearchResult[]> {
  const recipeIndex = recipes
    .map((r) => `${r.id}|${r.name}|${r.ingredients.map((i) => i.name).join(', ')}`)
    .join('\n');

  const systemPrompt = `You are a Cameroonian cooking ingredient matcher.
You will receive a list of recipes (format: id|name|ingredients) and user's available ingredients.
For each recipe, determine which of its ingredients the user HAS, using semantic matching:
- "poulet" matches "cuisses de poulet", "ailes de poulet", "poulet entier", etc.
- "tomate" matches "tomates cerises", "tomates fraîches", etc.
- "haricots blancs" matches "Haricots blancs (Koki / Cornilles)", "haricots de cornille", "niébé", etc.
- "piment" matches "piment rouge", "piment habanero", "piment jaune", etc.
- Be generous with matching: if the user's ingredient is a core component of a recipe ingredient, it's a match.

IMPORTANT - Classify each recipe ingredient as:
- "base": the main/essential ingredient(s) that define the dish (e.g. haricots for Koki, ndolé leaves for Ndolé)
- "secondary": supporting ingredients (e.g. huile de palme, feuilles de bananier)
- "generic": common pantry items everyone has (sel, poivre, eau, huile de friture, cube maggi) - EXCLUDE these from counts

Return ONLY a valid JSON array (no markdown):
[{"id":"recipe-id","matchedBase":["ingredient1"],"matchedSecondary":["ingredient2"],"totalBase":1,"totalSecondary":3,"reason":"${isFr ? 'Courte explication en français' : 'Short explanation in English'}"}]
- "matchedBase": base ingredients the user has
- "matchedSecondary": secondary ingredients the user has
- "totalBase": total base ingredients in recipe (excluding generic)
- "totalSecondary": total secondary ingredients in recipe (excluding generic)
- "reason": what key ingredients are missing, or "all main ingredients available" if they have the base
- Include ALL recipes where at least 1 base ingredient matches
- Return at most 15 results
- If nothing matches, return []`;

  const text = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `RECIPES:\n${recipeIndex}\n\nMY INGREDIENTS:\n${userIngredients.join(', ')}` }],
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response');

  type Raw = { id: string; matchedBase: string[]; matchedSecondary: string[]; totalBase: number; totalSecondary: number; reason: string };
  const parsed: Raw[] = JSON.parse(jsonMatch[0]);

  const BW = 0.6, SW = 0.4;
  return parsed
    .map((r) => {
      const bm = r.matchedBase?.length ?? 0, bt = Math.max(r.totalBase ?? 1, 1);
      const sm = r.matchedSecondary?.length ?? 0, st = Math.max(r.totalSecondary ?? 1, 1);
      return { id: r.id, match: Math.round((bm / bt * BW + sm / st * SW) * 100), reason: r.reason };
    })
    .filter((r) => r.match >= 15)
    .sort((a, b) => b.match - a.match)
    .slice(0, 10);
}

// ── AI free-text search ─────────────────────────────────────────────────

async function searchFreeTextAI(
  recipes: Recipe[],
  query: string,
  isFr: boolean,
): Promise<SearchResult[]> {
  const recipeIndex = recipes
    .map((r) => `${r.id}|${r.name}|${r.category}|${r.duration}min|${r.difficulty}|${r.spiciness}|${r.servings}pers|${r.ingredients.map((i) => i.name).join(', ')}`)
    .join('\n');

  const systemPrompt = `You are a Cameroonian cooking assistant. You help users find recipes based on natural language requests.
You will receive a list of recipes (format: id|name|category|duration|difficulty|spiciness|servings|ingredients) and a user request in natural language.

The user may ask things like:
- "un plat épicé avec du poulet pour 6 personnes"
- "something quick with tomatoes and onions"
- "je veux un dessert facile"
- "j'ai du manioc et des arachides, qu'est-ce que je peux faire?"
- "un truc pour le dimanche en famille"

Analyze the request and find the best matching recipes considering:
- Mentioned ingredients
- Desired cuisine type/category
- Time constraints (quick, long, etc.)
- Difficulty level
- Number of servings
- Spiciness preferences
- General mood/occasion

Return ONLY a valid JSON array (no markdown):
[{"id":"recipe-id","match":85,"reason":"${isFr ? 'Courte explication en français de pourquoi cette recette correspond' : 'Short explanation in English of why this recipe matches'}"}]
- "match": relevance score 0-100 based on how well the recipe fits the request
- "reason": brief explanation of why this recipe was selected
- Return at most 10 results, sorted by relevance
- Only include recipes with match >= 30
- If nothing matches, return []`;

  const text = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `RECIPES:\n${recipeIndex}\n\nREQUEST:\n${query}` }],
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response');

  const parsed: SearchResult[] = JSON.parse(jsonMatch[0]);
  return parsed.filter((r) => r.match >= 30).sort((a, b) => b.match - a.match).slice(0, 10);
}

// ── Component ───────────────────────────────────────────────────────────

export default function AIRecipesScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const recipes = useLocalizedRecipes();

  const [mode, setMode] = useState<Mode>('ingredients');
  const [input, setInput] = useState('');
  const [freeText, setFreeText] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [freeInputFocused, setFreeInputFocused] = useState(false);

  const isFr = settings.language === 'fr';
  const isConnected = useNetworkStatus();
  const { isPremium } = useLicense();
  const aiAvailable = !!process.env.EXPO_PUBLIC_API_URL && isConnected;

  const knownIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) =>
      r.ingredients.forEach((ing) => set.add(ing.name.toLowerCase().trim()))
    );
    return set;
  }, [recipes]);

  const suggestions = useMemo(() => {
    if (mode !== 'ingredients') return [];
    const cleaned = input.trim().toLowerCase();
    if (cleaned.length < 2) return [];
    const matches: string[] = [];
    for (const known of knownIngredients) {
      if (known.includes(cleaned) && !ingredients.some((i) => i.toLowerCase() === known)) {
        matches.push(known.charAt(0).toUpperCase() + known.slice(1));
      }
      if (matches.length >= 5) break;
    }
    return matches;
  }, [mode, input, knownIngredients, ingredients]);

  const addIngredient = useCallback((text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    if (ingredients.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setInput('');
      return;
    }
    if (!isValidIngredient(value, knownIngredients)) {
      setError(t('aiInvalidIngredient'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setIngredients((prev) => [...prev, value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()]);
    setInput('');
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [input, ingredients, knownIngredients, t]);

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setResults(null);
    setError(null);
    setUsedFallback(false);
  };

  const handleSearchIngredients = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setResults(null);
    setError(null);
    setUsedFallback(false);

    // Skip AI call if offline — go straight to local search
    if (!isConnected) {
      const localResults = searchByIngredients(recipes, ingredients, isFr);
      setResults(localResults.map((r) => ({ id: r.id, match: r.match, reason: r.reason })));
      setUsedFallback(true);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    try {
      const aiResults = await searchIngredientsAI(recipes, ingredients, isFr);
      setResults(aiResults);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      const localResults = searchByIngredients(recipes, ingredients, isFr);
      setResults(localResults.map((r) => ({ id: r.id, match: r.match, reason: r.reason })));
      setUsedFallback(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFreeText = async () => {
    Keyboard.dismiss();
    if (!freeText.trim()) return;
    if (!isPremium) {
      router.push('/tchop-ai' as any);
      return;
    }
    if (!aiAvailable) {
      setError(t('aiFreeUnavailable'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const aiResults = await searchFreeTextAI(recipes, freeText.trim(), isFr);
      setResults(aiResults);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError(t('aiError'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const canSearch = mode === 'ingredients' ? ingredients.length > 0 : freeText.trim().length > 0;
  const handleSearch = mode === 'ingredients' ? handleSearchIngredients : handleSearchFreeText;

  const matchedRecipes = useMemo(() => {
    if (!results) return [];
    return results
      .map((r) => {
        const recipe = recipes.find((rec) => rec.id === r.id);
        if (!recipe) return null;
        const missing = mode === 'ingredients' ? getMissingIngredients(recipe, ingredients) : [];
        return { recipe, match: r.match, reason: r.reason, missing };
      })
      .filter(Boolean) as { recipe: Recipe; match: number; reason: string; missing: string[] }[];
  }, [results, recipes, mode, ingredients]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
            gap: 16,
          }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.8 }}>
              {t('aiTitle')}
            </Text>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="sparkles" size={18} color="#A855F7" />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 + bottom, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>

          {/* Mode switcher */}
          <View
            style={{
              backgroundColor: isDark ? '#3A3A3A' : '#E4E2E1',
              borderRadius: 9999,
              padding: 4,
              flexDirection: 'row',
            }}>
            <TouchableOpacity
              onPress={() => switchMode('ingredients')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: mode === 'ingredients' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
                ...(mode === 'ingredients'
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                  : {}),
              }}>
              <Ionicons
                name="nutrition-outline"
                size={15}
                color={mode === 'ingredients' ? colors.accent : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: mode === 'ingredients' ? '700' : '500',
                  color: mode === 'ingredients' ? colors.accent : colors.textSecondary,
                }}>
                {t('aiModeIngredients')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchMode('free')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: mode === 'free' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
                ...(mode === 'free'
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                  : {}),
              }}>
              <Ionicons
                name="chatbubble-outline"
                size={15}
                color={mode === 'free' ? '#A855F7' : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: mode === 'free' ? '700' : '500',
                  color: mode === 'free' ? '#A855F7' : colors.textSecondary,
                }}>
                {t('aiModeFree')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            {mode === 'ingredients' ? t('aiDescription') : t('aiFreeDescription')}
          </Text>

          {/* ── Ingredients mode ── */}
          {mode === 'ingredients' && (
            <>
              {/* Input */}
              <View style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: colors.surface,
                    borderRadius: 20,
                    paddingLeft: 16,
                    paddingRight: 4,
                    alignItems: 'center',
                  }}>
                  <Ionicons name="nutrition-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    value={input}
                    onChangeText={(text) => { setInput(text); setError(null); }}
                    onSubmitEditing={() => addIngredient()}
                    placeholder={t('aiInputPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: colors.text,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => addIngredient()}
                    disabled={!input.trim()}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: input.trim() ? colors.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="add" size={20} color={input.trim() ? '#FFFFFF' : colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Autocomplete */}
                {suggestions.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => addIngredient(s)}
                        style={{
                          backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)',
                          borderRadius: 16,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                        <Ionicons name="add-circle-outline" size={14} color="#A855F7" />
                        <Text style={{ fontSize: 13, color: '#A855F7', fontWeight: '500' }}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Chips */}
              {ingredients.length > 0 && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('aiYourIngredients')} ({ingredients.length})
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ingredients.map((ing, index) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? 'rgba(145,71,0,0.15)' : 'rgba(145,71,0,0.08)',
                          borderRadius: 20,
                          paddingLeft: 14,
                          paddingRight: 6,
                          paddingVertical: 8,
                          gap: 6,
                        }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.accent }}>{ing}</Text>
                        <TouchableOpacity
                          onPress={() => removeIngredient(index)}
                          hitSlop={8}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: isDark ? 'rgba(145,71,0,0.3)' : 'rgba(145,71,0,0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Ionicons name="close" size={12} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── Free text mode ── */}
          {mode === 'free' && (
            <>
              {!aiAvailable && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
                  }}>
                  <Ionicons name="cloud-offline-outline" size={20} color="#EF4444" />
                  <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                    {t('aiFreeUnavailable')}
                  </Text>
                </View>
              )}
              {(() => {
                const collapsed = !freeInputFocused && results && results.length > 0;
                return (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 20,
                      padding: collapsed ? 12 : 16,
                      opacity: aiAvailable ? 1 : 0.5,
                      flexDirection: collapsed ? 'row' : 'column',
                      alignItems: collapsed ? 'center' : 'stretch',
                      gap: collapsed ? 8 : 0,
                    }}>
                    {collapsed && (
                      <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                    )}
                    <TextInput
                      value={freeText}
                      onChangeText={(text) => { setFreeText(text); setError(null); }}
                      onFocus={() => setFreeInputFocused(true)}
                      onBlur={() => setFreeInputFocused(false)}
                      placeholder={collapsed ? '' : t('aiFreePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      multiline={!collapsed}
                      numberOfLines={collapsed ? 1 : 4}
                      editable={aiAvailable}
                      textAlignVertical="top"
                      style={{
                        fontSize: collapsed ? 14 : 16,
                        color: colors.text,
                        minHeight: collapsed ? undefined : 100,
                        lineHeight: collapsed ? 18 : 24,
                        flex: collapsed ? 1 : undefined,
                      }}
                    />
                    {collapsed && (
                      <TouchableOpacity onPress={() => setFreeInputFocused(true)}>
                        <Ionicons name="create-outline" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </>
          )}

          {/* Error */}
          {error && (
            <Text style={{ fontSize: 13, color: '#E74C3C', paddingHorizontal: 4 }}>
              {error}
            </Text>
          )}

          {/* Search button */}
          <TouchableOpacity
            onPress={handleSearch}
            disabled={!canSearch || loading || (mode === 'free' && !aiAvailable)}
            activeOpacity={0.85}
            style={{
              backgroundColor: canSearch && !loading && (mode === 'ingredients' || aiAvailable) ? '#A855F7' : colors.surface,
              borderRadius: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name={mode === 'free' ? 'sparkles' : 'search'}
                size={18}
                color={canSearch && (mode === 'ingredients' || aiAvailable) ? '#FFFFFF' : colors.textMuted}
              />
            )}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: canSearch && !loading && (mode === 'ingredients' || aiAvailable) ? '#FFFFFF' : colors.textMuted,
              }}>
              {loading ? t('aiSearching') : t('aiSearch')}
            </Text>
          </TouchableOpacity>

          {/* Fallback notice */}
          {usedFallback && results && results.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: isDark ? 'rgba(245,158,66,0.1)' : 'rgba(245,158,66,0.08)',
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
              <Ionicons name="information-circle-outline" size={16} color="#F59E42" />
              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>
                {t('aiFallback')}
              </Text>
            </View>
          )}

          {/* Results */}
          {matchedRecipes.length > 0 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                {t('aiResults')} ({matchedRecipes.length})
              </Text>
              {matchedRecipes.map(({ recipe, match, reason, missing }) => (
                <View key={recipe.id} style={{ gap: 8 }}>
                  <RecipeCard recipe={recipe} />
                  <View style={{ paddingHorizontal: 8, gap: 4, marginTop: -4 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                      <View
                        style={{
                          backgroundColor: match >= 70 ? 'rgba(34,197,94,0.15)' : match >= 50 ? 'rgba(245,158,66,0.15)' : 'rgba(239,68,68,0.15)',
                          borderRadius: 12,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: match >= 70 ? '#22C55E' : match >= 50 ? '#F59E42' : '#EF4444',
                          }}>
                          {match}%
                        </Text>
                      </View>
                      <Text
                        style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}
                        numberOfLines={2}>
                        {reason}
                      </Text>
                    </View>
                    {mode === 'ingredients' && missing.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
                        <Ionicons name="cart-outline" size={13} color={colors.textMuted} style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1 }} numberOfLines={3}>
                          {isFr
                            ? `Il vous manque ${missing.length} ingrédient${missing.length > 1 ? 's' : ''} : ${missing.join(', ')}`
                            : `Missing ${missing.length} ingredient${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* No results */}
          {results && matchedRecipes.length === 0 && !loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>
                {t('aiNoResults')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                {t('aiNoResultsHint')}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
