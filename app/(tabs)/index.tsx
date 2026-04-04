import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useLicense } from '@/context/LicenseContext';
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
  const { isPremium } = useLicense();

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
            {isPremium && (
              <View
                style={{
                  backgroundColor: '#D4A017',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                  PLUS
                </Text>
              </View>
            )}
          </View>
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

        {/* AI Recipe Finder + Tchopé Plus */}
        {isPremium ? (
          <TouchableOpacity
            onPress={() => router.push('/ai-recipes' as any)}
            activeOpacity={0.85}
            style={{
              marginHorizontal: 24,
              marginTop: 16,
              borderRadius: 24,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: 'rgba(168,85,247,0.08)',
              borderWidth: 1.5,
              borderColor: 'rgba(168,85,247,0.15)',
            }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(168,85,247,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="sparkles" size={24} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {t('aiCta')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {t('aiCtaSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A855F7" />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', marginHorizontal: 24, marginTop: 16, gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push('/ai-recipes' as any)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                borderRadius: 20,
                padding: 16,
                gap: 10,
                backgroundColor: 'rgba(168,85,247,0.08)',
                borderWidth: 1.5,
                borderColor: 'rgba(168,85,247,0.15)',
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(168,85,247,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="search" size={20} color="#A855F7" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                {t('aiCta')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/tchop-ai' as any)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                borderRadius: 20,
                padding: 16,
                gap: 10,
                backgroundColor: colors.accent + '0C',
                borderWidth: 1.5,
                borderColor: colors.accent + '20',
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>
                {t('tchopePlusHome')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
