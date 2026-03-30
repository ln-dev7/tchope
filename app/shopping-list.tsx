import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useMealPlanner } from '@/context/MealPlannerContext';
import { useToast } from '@/hooks/useToast';
import type { Recipe } from '@/types';

type ShoppingItem = {
  name: string;
  quantity: string;
  recipes: string[]; // recipe names that use this ingredient
};

function buildShoppingList(
  plan: { days: Record<string, { meals: { recipeId: string }[] }> } | null,
  recipeMap: Record<string, Recipe>,
): ShoppingItem[] {
  if (!plan) return [];

  const items: Record<string, ShoppingItem> = {};

  Object.values(plan.days).forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = recipeMap[meal.recipeId];
      if (!recipe) return;

      recipe.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().trim();
        if (items[key]) {
          if (!items[key].recipes.includes(recipe.name)) {
            items[key].recipes.push(recipe.name);
          }
          if (ing.quantity && !items[key].quantity.includes(ing.quantity)) {
            items[key].quantity += `, ${ing.quantity}`;
          }
        } else {
          items[key] = {
            name: ing.name,
            quantity: ing.quantity || '',
            recipes: [recipe.name],
          };
        }
      });
    });
  });

  return Object.values(items).sort((a, b) => a.name.localeCompare(b.name));
}

export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { toast } = useToast();
  const recipes = useLocalizedRecipes();
  const { currentPlan } = useMealPlanner();

  const [checked, setChecked] = useState<Set<string>>(new Set());

  const recipeMap = useMemo(() => {
    const map: Record<string, Recipe> = {};
    recipes.forEach((r) => { map[r.id] = r; });
    return map;
  }, [recipes]);

  const items = useMemo(() => buildShoppingList(currentPlan, recipeMap), [currentPlan, recipeMap]);

  const uncheckedItems = useMemo(() => items.filter((i) => !checked.has(i.name.toLowerCase())), [items, checked]);
  const checkedItems = useMemo(() => items.filter((i) => checked.has(i.name.toLowerCase())), [items, checked]);

  const toggleItem = useCallback((name: string) => {
    const key = name.toLowerCase();
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const clearChecked = useCallback(() => {
    setChecked(new Set());
  }, []);

  const formatListAsText = useCallback(() => {
    const lines = items
      .filter((i) => !checked.has(i.name.toLowerCase()))
      .map((i) => `${i.quantity ? `${i.quantity} — ` : ''}${i.name}`);
    return `🛒 ${t('shoppingListTitle')} (Tchopé)\n\n${lines.map((l) => `• ${l}`).join('\n')}`;
  }, [items, checked, t]);

  const handleCopy = useCallback(async () => {
    const text = formatListAsText();
    await Clipboard.setStringAsync(text);
    toast(t('shoppingListCopied'), 'done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [formatListAsText, toast, t]);

  const handleShare = useCallback(async () => {
    const text = formatListAsText();
    await Share.share({ message: text });
  }, [formatListAsText]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
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
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
            {t('shoppingListTitle')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            {t('shoppingListSubtitle')}
          </Text>
        </View>
      </View>

      {/* Stats bar */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 20,
          marginBottom: 8,
          gap: 12,
        }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.accent + '10',
            borderRadius: 14,
            padding: 12,
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>
            {uncheckedItems.length}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.accent, marginTop: 2 }}>
            {t('shoppingListUnchecked')}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.green + '12',
            borderRadius: 14,
            padding: 12,
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.green }}>
            {checkedItems.length}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.green, marginTop: 2 }}>
            {t('shoppingListChecked')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + bottom }}
        showsVerticalScrollIndicator={false}>

        {items.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 12 }}>
              {t('shoppingListEmpty')}
            </Text>
          </View>
        )}

        {/* Unchecked items */}
        {uncheckedItems.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {uncheckedItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => toggleItem(item.name)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 12,
                }}>
                {/* Checkbox */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                    {item.name}
                  </Text>
                  {item.quantity ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.quantity}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }} numberOfLines={1}>
                    {item.recipes.join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Checked items */}
        {checkedItems.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.green, flex: 1 }}>
                {t('shoppingListChecked')} ({checkedItems.length})
              </Text>
              <TouchableOpacity onPress={clearChecked}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                  {t('shoppingListClearChecked')}
                </Text>
              </TouchableOpacity>
            </View>

            {checkedItems.map((item) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => toggleItem(item.name)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: 0.5,
                  gap: 12,
                }}>
                {/* Checked checkbox */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    backgroundColor: colors.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: colors.text,
                      textDecorationLine: 'line-through',
                    }}>
                    {item.name}
                  </Text>
                  {item.quantity ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.quantity}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      {items.length > 0 && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 12 + bottom,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: 'row',
            gap: 10,
          }}>
          <TouchableOpacity
            onPress={handleCopy}
            style={{
              flex: 1,
              backgroundColor: colors.accent,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
              {t('shoppingListCopy')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <Ionicons name="share-outline" size={18} color={colors.text} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              {t('shoppingListShare')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
