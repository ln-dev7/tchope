import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import FeaturedCard from '@/components/FeaturedCard';
import RecipeCard from '@/components/RecipeCard';
import RegionItem from '@/components/RegionItem';
import type { Region } from '@/types';

const ALL_REGIONS: Region[] = [
  'Littoral', 'Ouest', 'Centre', 'Sud', 'Nord',
  'Est', 'Adamaoua', 'Extrême-Nord', 'Nord-Ouest', 'Sud-Ouest',
];

const FEATURED_ORDER = [
  'ndole', 'poulet-dg', 'eru', 'mbongo-tchobi', 'koki',
  'taro-sauce-jaune', 'kondre', 'sanga', 'okok-sucre',
  'poisson-braise', 'ekwang', 'met-de-pistache', 'okok-sale',
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

  const featuredRecipes = useMemo(
    () => FEATURED_ORDER.map((id) => recipes.find((r) => r.id === id)).filter(Boolean) as typeof recipes,
    [recipes],
  );

  const popularRecipes = useMemo(
    () => POPULAR_ORDER.map((id) => recipes.find((r) => r.id === id)).filter(Boolean).slice(0, 10) as typeof recipes,
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

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 24,
            backgroundColor: colors.inputBg,
            borderRadius: 48,
            paddingLeft: 48,
            paddingRight: 16,
            paddingVertical: 18,
            position: 'relative',
          }}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textSecondary}
            style={{ position: 'absolute', left: 16, top: 20 }}
          />
          <Text style={{ fontSize: 16, color: 'rgba(92,91,91,0.6)' }}>
            {t('searchPlaceholder')}
          </Text>
        </TouchableOpacity>

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
            {ALL_REGIONS.map((region) => (
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

        {/* Featured Recipes Section */}
        <View style={{ paddingVertical: 16, gap: 24 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.6,
              }}>
              {t('featuredRecipes')}
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

        {/* Popular Recipes Section */}
        <View style={{ paddingVertical: 16, gap: 24 }}>
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
