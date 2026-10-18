import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  FlatList,
  ViewToken,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import RecipeImage from '@/components/RecipeImage';
import { type } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';

export const ONBOARDING_KEY = 'tchope_onboarding_done';

type Slide = {
  icon: string;
  recipeId: string;
  titleKey: string;
  descKey: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'restaurant',
    recipeId: 'ndole',
    titleKey: 'onboarding1Title',
    descKey: 'onboarding1Desc',
  },
  {
    icon: 'book',
    recipeId: 'poisson-braise',
    titleKey: 'onboarding2Title',
    descKey: 'onboarding2Desc',
  },
  {
    icon: 'sparkles',
    recipeId: 'poulet-dg',
    titleKey: 'onboarding3Title',
    descKey: 'onboarding3Desc',
  },
  {
    icon: 'shield-checkmark',
    recipeId: 'eru',
    titleKey: 'onboarding4Title',
    descKey: 'onboarding4Desc',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH, height } = useWindowDimensions();
  const { t } = useTranslation();
  const { settings, updateLanguage } = useSettings();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isFr = settings.language === 'fr';

  const toggleLanguage = useCallback(() => {
    updateLanguage(isFr ? 'en' : 'fr');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isFr, updateLanguage]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)' as any);
  }, [router]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      finish();
    }
  }, [currentIndex, finish]);

  const isLast = currentIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => (
    <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
      <View style={{ height: Math.min(280, height * 0.29), borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}>
        <RecipeImage recipeId={item.recipeId} category="Plat" style={{ width: '100%', height: '100%' }} borderRadius={0} />
        <View style={{ position: 'absolute', bottom: 16, left: 16, width: 48, height: 48, borderRadius: 16, backgroundColor: colors.photoControl, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={item.icon as any} size={24} color={colors.photoInk} />
        </View>
      </View>
      <Text style={[type.display, { color: colors.text, fontSize: 32, lineHeight: 39, marginBottom: 12 }]}>{t(item.titleKey as any)}</Text>
      <Text style={{ fontSize: 16, color: colors.textSecondary, lineHeight: 25 }}>{t(item.descKey as any)}</Text>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header: language toggle + skip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}>
            <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {isFr ? 'FR' : 'EN'}
            </Text>
          </TouchableOpacity>
          {!isLast ? (
            <TouchableOpacity onPress={finish} hitSlop={16}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMuted }}>
                {t('onboardingSkip')}
              </Text>
            </TouchableOpacity>
          ) : <View />}
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={{ flex: 1 }}
        />

        {/* Bottom section */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
          {/* Dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIndex ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentIndex ? colors.accent : colors.border,
                }}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 14,
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.onAccent }}>
              {isLast ? t('onboardingStart') : t('onboardingNext')}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />}
          </TouchableOpacity>

          {/* Dev credit */}
          <TouchableOpacity
            onPress={() => Linking.openURL('https://lndev.me')}
            style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {isFr ? 'Développé par' : 'Developed by'}{' '}
              <Text style={{ fontWeight: '600', textDecorationLine: 'underline', color: colors.textSecondary }}>
                lndev.me
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
