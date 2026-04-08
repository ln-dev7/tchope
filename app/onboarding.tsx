import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_KEY = 'tchope_onboarding_done';

type Slide = {
  icon: string;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  descKey: string;
  emoji: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'restaurant',
    iconBg: 'rgba(145,71,0,0.12)',
    iconColor: '#914700',
    titleKey: 'onboarding1Title',
    descKey: 'onboarding1Desc',
    emoji: '🇨🇲',
  },
  {
    icon: 'book',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#A855F7',
    titleKey: 'onboarding2Title',
    descKey: 'onboarding2Desc',
    emoji: '👨‍🍳',
  },
  {
    icon: 'sparkles',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#A855F7',
    titleKey: 'onboarding3Title',
    descKey: 'onboarding3Desc',
    emoji: '🤖',
  },
  {
    icon: 'shield-checkmark',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22C55E',
    titleKey: 'onboarding4Title',
    descKey: 'onboarding4Desc',
    emoji: '🔒',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
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
    <View
      style={{
        width: SCREEN_WIDTH,
        paddingHorizontal: 40,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      {/* Icon circle */}
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: item.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
        <Ionicons name={item.icon as any} size={48} color={item.iconColor} />
      </View>

      {/* Emoji */}
      <Text style={{ fontSize: 32, marginBottom: 24 }}>{item.emoji}</Text>

      {/* Title */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: colors.text,
          textAlign: 'center',
          letterSpacing: -1,
          marginBottom: 16,
        }}>
        {t(item.titleKey as any)}
      </Text>

      {/* Description */}
      <Text
        style={{
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
          maxWidth: 300,
        }}>
        {t(item.descKey as any)}
      </Text>
    </View>
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
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
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
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={{ flex: 1 }}
        />

        {/* Bottom section */}
        <View style={{ paddingHorizontal: 40, paddingBottom: 24, gap: 24 }}>
          {/* Dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIndex ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentIndex ? SLIDES[currentIndex].iconColor : colors.border,
                }}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={{
              backgroundColor: SLIDES[currentIndex].iconColor,
              borderRadius: 20,
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
              {isLast ? t('onboardingStart') : t('onboardingNext')}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
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
