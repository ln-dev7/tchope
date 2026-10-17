import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/context/UserRecipesContext';
import FeaturedCard from '@/components/FeaturedCard';
import RecipeCard from '@/components/RecipeCard';
import RegionItem from '@/components/RegionItem';
import type { Region } from '@/types';

const ALL_REGIONS: Region[] = [
  'Littoral', 'Ouest', 'Centre', 'Sud', 'Nord',
  'Est', 'Adamaoua', 'Extrême-Nord', 'Nord-Ouest', 'Sud-Ouest',
];

const FEATURED_ORDER = [
  'ndole', 'poulet-dg', 'eru', 'poisson-braise',
];

const POPULAR_ORDER = [
  'ndole', 'poulet-dg', 'eru', 'mbongo-tchobi', 'koki',
  'taro-sauce-jaune', 'kondre', 'sanga', 'okok-sucre',
  'poisson-braise', 'ekwang', 'met-de-pistache', 'okok-sale',
  'soya', 'pepper-soup', 'beignets-farine', 'plantains-frits-epices',
  'corn-tchap', 'njama-njama', 'kati-kati',
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const recipes = useLocalizedRecipes();
  const { bottom } = useSafeAreaInsets();
  const { userRecipes } = useUserRecipes();

  const hasTchopAIRecipes = userRecipes.some((r) => r.region === 'TchopAI');
  const displayRegions = useMemo(
    () => hasTchopAIRecipes ? [...ALL_REGIONS, 'TchopAI' as Region] : ALL_REGIONS,
    [hasTchopAIRecipes],
  );

  const featuredRecipes = useMemo(
    () => FEATURED_ORDER.map((id) => recipes.find((r) => r.id === id)).filter(Boolean) as typeof recipes,
    [recipes],
  );

  const popularRecipes = useMemo(
    () => POPULAR_ORDER.filter((id) => !FEATURED_ORDER.includes(id)).map((id) => recipes.find((r) => r.id === id)).filter(Boolean).slice(0, 10) as typeof recipes,
    [recipes],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 + bottom }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: colors.accent,
                letterSpacing: -1.2,
              }}>
              Tchopé
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 24,
            backgroundColor: colors.inputBg,
            borderRadius: 20,
            paddingLeft: 48,
            paddingRight: 16,
            paddingVertical: 14,
            position: 'relative',
          }}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={{ position: 'absolute', left: 16, top: 17 }}
          />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {t('searchPlaceholder')}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, gap: 10 }}>
          <TouchableOpacity onPress={() => router.push('/search?duration=under30')} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={18} color={colors.accent} /><Text style={{ color: colors.text, fontWeight: '600' }}>{t('quickRecipes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/ai-recipes')} style={{ backgroundColor: colors.card, padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="nutrition-outline" size={18} color={colors.accent} /><Text style={{ color: colors.text, fontWeight: '600' }}>{t('withIngredients')}</Text>
          </TouchableOpacity>
        </ScrollView>
        {/* Featured Recipes Section */}
        <View style={{ paddingVertical: 16, gap: 14 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.6,
              }}>
              {t('homeHeadline')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24 }}>
            {featuredRecipes.map((recipe) => (
              <FeaturedCard key={recipe.id} recipe={recipe} />
            ))}
          </ScrollView>
        </View>

        {/* Regions Section */}
        <View style={{ paddingVertical: 16, gap: 16 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
                letterSpacing: -0.5,
              }}>
              {t('regions')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
            {displayRegions.map((region) => (
              <RegionItem
                key={region}
                region={region}
                onPress={() =>
                  router.push(`/recipes-list?region=${encodeURIComponent(region)}&title=${encodeURIComponent(region)}` as any)
                }
              />
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity onPress={() => router.push('/tchop-ai')} style={{ marginHorizontal: 24, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{t('askAI')}</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>{t('askAISubtitle')}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {/* Popular Recipes Section */}
        <View style={{ paddingVertical: 16, gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
            }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
              }}>
              {t('popularRecipes')}
            </Text>
            <TouchableOpacity onPress={() => router.push(`/recipes-list?title=${encodeURIComponent(t('allRecipes'))}` as any)}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.accent,
                }}>
                {t('seeAll')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 24, gap: 16 }}>
            {popularRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
