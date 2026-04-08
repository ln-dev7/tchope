import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ScrollView,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useTimer, TimerEntry } from '@/context/TimerContext';
import { useToast } from '@/hooks/useToast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTimeFromStep(step: string): number | null {
  const lower = step.toLowerCase();
  const hourMatch = lower.match(/(\d+)\s*(?:h(?:eures?)?|hours?)(?:\s*(?:et\s*)?(\d+)\s*(?:min(?:utes?)?)?)?/);
  if (hourMatch) {
    let seconds = parseInt(hourMatch[1]) * 3600;
    if (hourMatch[2]) seconds += parseInt(hourMatch[2]) * 60;
    return seconds;
  }
  const minMatch = lower.match(/(\d+)\s*(?:min(?:utes?)?)/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const secMatch = lower.match(/(\d+)\s*(?:sec(?:ondes?|onds?)?)/);
  if (secMatch) return parseInt(secMatch[1]);
  return null;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
}

export default function CookingModeScreen() {
  const { id, step: stepParam } = useLocalSearchParams<{ id: string; step?: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  const { startTimer, pauseTimer, resumeTimer, stopTimer, stopAllTimers, getTimersForRecipe } = useTimer();
  const { toast } = useToast();
  const { settings } = useSettings();

  const recipe = recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);
  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;

  const initialStep = stepParam && totalSteps > 0 ? Math.min(parseInt(stepParam, 10), totalSteps - 1) : 0;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [showCustomTimer, setShowCustomTimer] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const isFr = settings.language === 'fr';
  const stepTimes = useMemo(() => steps.map(parseTimeFromStep), [steps]);

  // All active timers for this recipe
  const recipeTimers = getTimersForRecipe(id!);
  const hasTimers = recipeTimers.length > 0;

  // Check if a specific step already has a running timer
  const stepHasTimer = useCallback((stepIndex: number) => {
    return recipeTimers.some((entry) => entry.stepIndex === stepIndex);
  }, [recipeTimers]);

  // Load saved voice preference
  useEffect(() => {
    AsyncStorage.getItem('tchope_voice_reading').then((val) => {
      setVoiceEnabled(val === null ? true : val === 'true');
    });
  }, []);

  // Read step aloud when it changes
  useEffect(() => {
    if (voiceEnabled === null || !voiceEnabled || steps.length === 0) return;
    Speech.stop();
    Speech.speak(steps[currentStep], {
      language: isFr ? 'fr-FR' : 'en-US',
      rate: 0.9,
    });
  }, [currentStep, voiceEnabled]);

  // Stop speech when leaving the screen
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => { Speech.stop(); });
    return () => { unsubscribe(); Speech.stop(); };
  }, [navigation]);

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
    if (currentStep < totalSteps - 1) goToStep(currentStep + 1);
  }, [currentStep, totalSteps, goToStep]);

  const handleFinish = useCallback(() => {
    Speech.stop();
    stopAllTimers();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(t('cookingComplete'), 'done');
    router.back();
  }, [router, toast, t, stopAllTimers]);

  const toggleVoice = useCallback(() => {
    const next = !(voiceEnabled ?? true);
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

  const renderStep = ({ item, index }: { item: string; index: number }) => {
    const thisStepHasTimer = stepHasTimer(index);

    return (
      <View
        style={{
          width: SCREEN_WIDTH,
          height: listHeight || undefined,
          paddingHorizontal: 32,
          justifyContent: hasTimers ? 'flex-start' : 'center',
          paddingTop: hasTimers ? 36 : 0,
        }}>
        <View
          style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
            alignSelf: 'center', marginBottom: 24,
          }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF' }}>{index + 1}</Text>
        </View>
        <Text
          style={{ fontSize: 20, fontWeight: '500', color: colors.text, lineHeight: 32, textAlign: 'center' }}>
          {item}
        </Text>

        {/* Timer controls — hidden if THIS step already has a timer */}
        {!thisStepHasTimer && (
          showCustomTimer === index ? (
            <View style={{ alignItems: 'center', marginTop: 24, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity
                  onPress={() => setCustomMinutes((m) => Math.max(1, m - 1))}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="remove" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], minWidth: 70, textAlign: 'center' }}>
                  {customMinutes} min
                </Text>
                <TouchableOpacity
                  onPress={() => setCustomMinutes((m) => Math.min(180, m + 1))}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => { startTimer(id!, `${recipe!.name} — ${t('steps')} ${index + 1}`, customMinutes * 60, index); setShowCustomTimer(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24 }}>
                <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{t('startStepTimer')}</Text>
              </TouchableOpacity>
            </View>
          ) : stepTimes[index] != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => startTimer(id!, `${recipe!.name} — ${t('steps')} ${index + 1}`, stepTimes[index]!, index)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent + '15', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24 }}>
                <Ionicons name="timer-outline" size={20} color={colors.accent} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>
                  {t('startStepTimer')} ({formatDuration(stepTimes[index]!)})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowCustomTimer(index); setCustomMinutes(Math.ceil(stepTimes[index]! / 60)); }}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pencil" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setShowCustomTimer(index); setCustomMinutes(5); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.surface }}>
              <Ionicons name="timer-outline" size={18} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t('addTimer')}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  // Full-size timer card (single timer mode)
  const renderFullTimer = (entry: TimerEntry) => {
    const isDone = entry.totalSeconds > 0 && entry.remainingSeconds === 0 && !entry.isRunning && !entry.isPaused;
    const timerProgress = entry.totalSeconds > 0 ? (entry.totalSeconds - entry.remainingSeconds) / entry.totalSeconds : 0;
    const isOnDifferentStep = entry.stepIndex != null && entry.stepIndex !== currentStep;

    return (
      <View
        style={{
          backgroundColor: isDone ? '#0A6A1D' : entry.isPaused ? '#6B5B00' : '#914700',
          borderRadius: 20,
          padding: 16,
          gap: 10,
        }}>
        {isOnDifferentStep && entry.stepIndex != null && (
          <TouchableOpacity
            onPress={() => goToStep(entry.stepIndex!)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="return-up-back" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
              {t('stepTimer')} {entry.stepIndex + 1}
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : entry.isPaused ? 'pause-circle' : 'timer-outline'}
              size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
              {isDone ? t('timerReady') : formatTime(entry.remainingSeconds)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!isDone && (
              <TouchableOpacity
                onPress={() => { if (entry.isPaused) resumeTimer(entry.id); else pauseTimer(entry.id); }}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={entry.isPaused ? 'play' : 'pause'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => stopTimer(entry.id)}
              style={{ height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
              <Ionicons name={isDone ? 'checkmark' : 'stop'} size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{isDone ? t('timerClose') : t('timerStop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!isDone && (
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
            <View style={{ width: `${timerProgress * 100}%`, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 }} />
          </View>
        )}
      </View>
    );
  };

  // Horizontal timer pill (multi-timer mode) — tap pill to go to step, tap buttons for controls
  const renderTimerPill = (entry: TimerEntry) => {
    const isDone = entry.totalSeconds > 0 && entry.remainingSeconds === 0 && !entry.isRunning && !entry.isPaused;

    return (
      <TouchableOpacity
        key={entry.id}
        activeOpacity={0.8}
        onPress={() => entry.stepIndex != null && goToStep(entry.stepIndex)}
        style={{
          backgroundColor: isDone ? '#0A6A1D' : entry.isPaused ? '#6B5B00' : '#914700',
          borderRadius: 22,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 4,
          height: 40,
          gap: 6,
          marginRight: 8,
        }}>
        {/* Step number */}
        {entry.stepIndex != null && (
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
            {entry.stepIndex + 1}
          </Text>
        )}
        {/* Countdown */}
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
          {isDone ? '!' : formatTime(entry.remainingSeconds)}
        </Text>
        {/* Controls — stopPropagation to not trigger navigation */}
        {!isDone && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); if (entry.isPaused) resumeTimer(entry.id); else pauseTimer(entry.id); }}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={entry.isPaused ? 'play' : 'pause'} size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); stopTimer(entry.id); }}
          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={isDone ? 'checkmark' : 'stop'} size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, gap: 16 }}>
          <TouchableOpacity
            onPress={() => { Speech.stop(); router.back(); }}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={1}>{recipe.name}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {t('steps')} {currentStep + 1} {t('stepOf')} {totalSteps}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/live-cooking?id=${id}&step=${currentStep}` as any)}
            style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(168,85,247,0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Ionicons name="mic" size={16} color="#A855F7" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#A855F7' }}>Live</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleVoice}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (voiceEnabled ?? true) ? colors.accent + '15' : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={(voiceEnabled ?? true) ? 'volume-high' : 'volume-mute'} size={20} color={(voiceEnabled ?? true) ? colors.accent : colors.textMuted} />
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

        {/* Timer zone — fixed height to prevent layout shift */}
        {hasTimers ? (
          recipeTimers.length === 1 ? (
            <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
              {renderFullTimer(recipeTimers[0])}
            </View>
          ) : (
            <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {recipeTimers.map(renderTimerPill)}
            </ScrollView>
          )
        ) : null}

        {/* Swipeable steps */}
        <View style={{ flex: 1 }} onLayout={(e) => { if (!listHeight) setListHeight(e.nativeEvent.layout.height); }}>
          {listHeight > 0 && (
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
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              extraData={`${recipeTimers.length}-${showCustomTimer}-${customMinutes}`}
              initialScrollIndex={initialStep}
            />
          )}

        </View>

        {/* Bottom navigation */}
        <SafeAreaView edges={['bottom']}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={handlePrev}
              disabled={currentStep === 0}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 16,
                opacity: currentStep === 0 ? 0.4 : 1,
              }}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{t('previousStep')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={currentStep === totalSteps - 1 ? handleFinish : handleNext}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: currentStep === totalSteps - 1 ? colors.green : colors.accent,
                borderRadius: 20, paddingVertical: 16,
              }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {currentStep === totalSteps - 1 ? t('finishCooking') : t('nextStep')}
              </Text>
              <Ionicons name={currentStep === totalSteps - 1 ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}
