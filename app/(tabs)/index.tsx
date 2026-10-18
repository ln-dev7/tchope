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
import { type } from '@/constants/design';
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
    <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 840, alignSelf: 'center', backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentInsetAdjustmentBehavior="never" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 112 + bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="restaurant-outline" size={19} color={colors.onAccent} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -1 }}>Tchopé</Text>
          </View>
          <Text style={[type.label, { color: colors.accent, marginBottom: 12 }]}>{t('homeEyebrow')}</Text>
          <Text accessibilityRole="header" style={[type.display, { color: colors.text, maxWidth: 520 }]}>{t('homeHeadline')}</Text>
          <Text style={[type.body, { color: colors.textSecondary, marginTop: 10 }]}>{t('homeSubtitle')}</Text>
        </View>

        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}
          style={{ marginHorizontal: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="search-outline" size={21} color={colors.accent} />
          <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{t('searchPlaceholder')}</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4, gap: 10 }}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/search?duration=under30')} style={{ minHeight: 44, backgroundColor: colors.greenLight, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons name="time-outline" size={17} color={colors.greenText} /><Text style={{ color: colors.greenText, fontSize: 13, fontWeight: '600' }}>{t('quickRecipes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/ai-recipes')} style={{ minHeight: 44, backgroundColor: colors.accentSoft, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons name="nutrition-outline" size={17} color={colors.accent} /><Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>{t('withIngredients')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ paddingTop: 30, gap: 16 }}>
          <Text accessibilityRole="header" style={[type.section, { paddingHorizontal: 24, color: colors.text }]}>{t('homeSelection')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}>
            {featuredRecipes.map((recipe) => <FeaturedCard key={recipe.id} recipe={recipe} />)}
          </ScrollView>
        </View>

        <View style={{ paddingVertical: 32, gap: 18 }}>
          <View style={{ paddingHorizontal: 24, gap: 6 }}>
            <Text accessibilityRole="header" style={[type.section, { color: colors.text }]}>{t('regions')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('regionSubtitle')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
            {displayRegions.map((region) => <RegionItem key={region} region={region} onPress={() => router.push(`/recipes-list?region=${encodeURIComponent(region)}&title=${encodeURIComponent(region)}` as any)} />)}
          </ScrollView>
        </View>

        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/tchop-ai')} activeOpacity={0.85}
          style={{ marginHorizontal: 24, padding: 20, backgroundColor: colors.accentSoft, borderRadius: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.1, flex: 1 }}>{t('aiEyebrow')}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 19, letterSpacing: -0.3 }}>{t('askAI')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{t('askAISubtitle')}</Text>
        </TouchableOpacity>

        <View style={{ paddingTop: 32, gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, gap: 12 }}>
            <Text accessibilityRole="header" style={[type.section, { color: colors.text, flex: 1 }]}>{t('popularRecipes')}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/recipes-list?title=${encodeURIComponent(t('allRecipes'))}` as any)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{t('seeAll')} →</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {popularRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
