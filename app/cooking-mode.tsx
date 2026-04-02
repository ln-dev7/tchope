import React, { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useTimer } from '@/context/TimerContext';
import { useToast } from '@/hooks/useToast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  const { timer, pauseTimer, resumeTimer, stopTimer, isPaused } = useTimer();
  const { toast } = useToast();
  const { settings } = useSettings();

  const recipe = recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);
  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceLoaded = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const isFr = settings.language === 'fr';

  // Load saved voice preference
  useEffect(() => {
    AsyncStorage.getItem('tchope_voice_reading').then((val) => {
      if (val !== null) setVoiceEnabled(val === 'true');
      voiceLoaded.current = true;
    });
  }, []);

  // Read step aloud when it changes
  useEffect(() => {
    if (!voiceLoaded.current || !voiceEnabled || steps.length === 0) return;
    Speech.stop();
    Speech.speak(steps[currentStep], {
      language: isFr ? 'fr-FR' : 'en-US',
      rate: 0.9,
    });
  }, [currentStep, voiceEnabled]);

  // Stop speech when leaving the screen
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  // Timer state for this recipe
  const hasTimer = timer.recipeId === id && (timer.isRunning || isPaused || (timer.totalSeconds > 0 && timer.remainingSeconds === 0));
  const isDone = timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.isRunning && !isPaused;
  const timerProgress = timer.totalSeconds > 0 ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds : 0;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentStep(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToStep = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const handleFinish = useCallback(() => {
    Speech.stop();
    stopTimer();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(t('cookingComplete'), 'done');
    router.back();
  }, [router, toast, t, stopTimer]);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    AsyncStorage.setItem('tchope_voice_reading', String(next));
    if (!next) Speech.stop();
    toast(next ? t('voiceReadingOn') : t('voiceReadingOff'), 'done');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [voiceEnabled, toast, t]);

  if (!recipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text }}>Recipe not found</Text>
      </SafeAreaView>
    );
  }

  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  const renderStep = ({ item, index }: { item: string; index: number }) => (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          marginBottom: 24,
        }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF' }}>
          {index + 1}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: '500',
          color: colors.text,
          lineHeight: 32,
          textAlign: 'center',
        }}>
        {item}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 12,
            gap: 16,
          }}>
          <TouchableOpacity
            onPress={() => { Speech.stop(); router.back(); }}
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {recipe.name}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {t('steps')} {currentStep + 1} {t('stepOf')} {totalSteps}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleVoice}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: voiceEnabled ? colors.accent + '15' : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons
              name={voiceEnabled ? 'volume-high' : 'volume-mute'}
              size={20}
              color={voiceEnabled ? colors.accent : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: colors.border, marginHorizontal: 24, borderRadius: 2 }}>
          <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: colors.accent, borderRadius: 2 }} />
        </View>

        {/* Step dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 16 }}>
          {steps.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToStep(i)}>
              <View
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentStep ? colors.accent : (i < currentStep ? colors.accent + '60' : colors.border),
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Swipeable steps */}
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStep}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          style={{ flex: 1 }}
        />

        {/* Inline Timer */}
        {hasTimer && (
          <View
            style={{
              marginHorizontal: 24,
              marginBottom: 8,
              backgroundColor: isDone ? '#0A6A1D' : isPaused ? '#6B5B00' : '#914700',
              borderRadius: 20,
              padding: 16,
              gap: 10,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={isDone ? 'checkmark-circle' : isPaused ? 'pause-circle' : 'timer-outline'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
                  {isDone ? t('timerReady') : formatTime(timer.remainingSeconds)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!isDone && (
                  <TouchableOpacity
                    onPress={() => { if (isPaused) resumeTimer(); else pauseTimer(); }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => { stopTimer(); router.back(); }}
                  style={{
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    paddingHorizontal: 16,
                  }}>
                  <Ionicons name="stop" size={18} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{t('timerStop')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {!isDone && (
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <View style={{ width: `${timerProgress * 100}%`, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 }} />
              </View>
            )}
          </View>
        )}

        {/* Bottom navigation */}
        <SafeAreaView edges={['bottom']}>
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 24,
              paddingVertical: 16,
              gap: 12,
            }}>
            <TouchableOpacity
              onPress={handlePrev}
              disabled={currentStep === 0}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingVertical: 16,
                opacity: currentStep === 0 ? 0.4 : 1,
              }}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                {t('previousStep')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={currentStep === totalSteps - 1 ? handleFinish : handleNext}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: currentStep === totalSteps - 1 ? colors.green : colors.accent,
                borderRadius: 20,
                paddingVertical: 16,
              }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {currentStep === totalSteps - 1 ? t('finishCooking') : t('nextStep')}
              </Text>
              <Ionicons
                name={currentStep === totalSteps - 1 ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}
