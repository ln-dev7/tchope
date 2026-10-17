import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useMealPlanner } from '@/context/MealPlannerContext';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useToast } from '@/hooks/useToast';
import { localDateKey } from '@/utils/meal-planning';
import RecipeImage from '@/components/RecipeImage';

const SLOTS = ['breakfastMeal', 'lunchMeal', 'dinnerMeal'] as const;
export default function PlanMealScreen() {
  const params = useLocalSearchParams<{ recipeId?: string; servings?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { toast } = useToast();
  const catalogue = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  const { addMeal, isLoaded, currentPlan } = useMealPlanner();
  const recipes = useMemo(() => [...catalogue, ...userRecipes], [catalogue, userRecipes]);
  const [recipeId, setRecipeId] = useState(params.recipeId ?? '');
  const recipe = recipes.find(r => r.id === recipeId);
  const [portions, setPortions] = useState<number | null>(() => {
    const value = Number(params.servings);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  });
  const servings = portions ?? recipe?.servings ?? 1;
  const [date, setDate] = useState(localDateKey(new Date()));
  const [slot, setSlot] = useState<typeof SLOTS[number]>('dinnerMeal');
  const [query, setQuery] = useState('');
  const dates = useMemo(() => {
    const next = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return localDateKey(d); });
    return [...new Set([...next, ...Object.keys(currentPlan?.days ?? {}).filter(d => d >= next[0])])].sort();
  }, [currentPlan]);
  const filtered = recipes.filter(r => r.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const chip = (active: boolean) => ({ padding: 12, borderRadius: 16, backgroundColor: active ? colors.accent : colors.surface, minHeight: 44, justifyContent: 'center' as const });
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <TouchableOpacity accessibilityLabel={t('back')} accessibilityRole="button" onPress={() => router.back()} style={{ padding: 12 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, flex: 1 }}>{t('manualMeal')}</Text>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 18, color: colors.text, fontWeight: '700' }}>{t('mealDate')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {dates.map(day => <TouchableOpacity key={day} accessibilityRole="button" accessibilityState={{ selected: date === day }} onPress={() => setDate(day)} style={chip(day === date)}>
          <Text style={{ color: day === date ? colors.chipActiveText : colors.text, fontWeight: '600' }}>{new Date(day + 'T12:00:00').toLocaleDateString(settings.language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <Text style={{ fontSize: 18, color: colors.text, fontWeight: '700' }}>{t('mealSlot')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{SLOTS.map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: slot === value }} onPress={() => setSlot(value)} style={chip(value === slot)}><Text style={{ color: value === slot ? colors.chipActiveText : colors.text, fontWeight: '600' }}>{t(value)}</Text></TouchableOpacity>)}</View>
      {recipe && <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.card, gap: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: colors.text }}>{recipe.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, color: colors.textSecondary }}>{t('portions')}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('decreaseServings')} disabled={servings <= 1} onPress={() => setPortions(Math.max(1, servings - 1))} style={chip(false)}><Ionicons name="remove" size={20} color={servings <= 1 ? colors.textMuted : colors.accent} /></TouchableOpacity>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{servings}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('increaseServings')} onPress={() => setPortions(servings + 1)} style={chip(false)}><Ionicons name="add" size={20} color={colors.accent} /></TouchableOpacity>
        </View>
      </View>}
      <Text style={{ fontSize: 18, color: colors.text, fontWeight: '700' }}>{t('chooseRecipe')}</Text>
      <TextInput accessibilityLabel={t('searchPlaceholder')} value={query} onChangeText={setQuery} placeholder={t('searchPlaceholder')} placeholderTextColor={colors.textSecondary} style={{ backgroundColor: colors.inputBg, color: colors.text, borderRadius: 16, padding: 16, fontSize: 16 }} />
      {filtered.length === 0 && <Text style={{ color: colors.textSecondary }}>{t('noResults')}</Text>}
      {filtered.map(r => <TouchableOpacity key={r.id} onPress={() => { setRecipeId(r.id); setPortions(null); }} accessibilityRole="button" accessibilityState={{ selected: recipeId === r.id }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: recipeId === r.id ? colors.accent : colors.border, backgroundColor: colors.card }}>
        <RecipeImage recipeId={r.id} category={r.category} imageUri={'imageUri' in r ? r.imageUri as string : undefined} isDark={isDark} style={{ width: 64, height: 64 }} borderRadius={14} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{r.name}</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>{r.duration} min · {r.region}</Text></View>
        <Ionicons name={recipeId === r.id ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={recipeId === r.id ? colors.accent : colors.textMuted} />
      </TouchableOpacity>)}
    </ScrollView>
    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
      <TouchableOpacity disabled={!recipe || !isLoaded} onPress={() => {
        if (!recipe) return;
        addMeal(date, { recipeId: recipe.id, label: t(slot), slot, servings });
        toast(t('mealAdded'), 'done'); router.replace('/(tabs)/planner');
      }} style={{ backgroundColor: colors.accent, opacity: recipe && isLoaded ? 1 : 0.5, borderRadius: 18, padding: 18, alignItems: 'center' }}><Text style={{ color: colors.chipActiveText, fontSize: 16, fontWeight: '700' }}>{t('planRecipe')}</Text></TouchableOpacity>
    </View>
  </SafeAreaView>;
}
