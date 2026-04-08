import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { deactivateKeepAwake, activateKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useTimer } from '@/context/TimerContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.72;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type LocalTimer = {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  endTime: number;
  createdAt: number;
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TimerScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { timers: globalTimers, isTimerRunning: recipeTimerRunning, pauseTimer: pauseRecipeTimer, resumeTimer: resumeRecipeTimer, stopTimer: stopRecipeTimer } = useTimer();
  const recipeTimerList = Array.from(globalTimers.values());

  // Local timers (multiple)
  const [timers, setTimers] = useState<LocalTimer[]>([]);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);

  // Duration picker state
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(5);
  const [pickerSeconds, setPickerSeconds] = useState(0);
  const [timerLabel, setTimerLabel] = useState('');

  // Keep screen awake
  const [keepAwake, setKeepAwake] = useState(true);

  // Sound options
  const [tickSound, setTickSound] = useState(true);
  const tickSoundRef = useRef<Audio.Sound | null>(null);
  const alarmSoundRef = useRef<Audio.Sound | null>(null);
  const finishedTimersRef = useRef<Set<string>>(new Set());

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // View mode
  const [showPicker, setShowPicker] = useState(true);

  // Previous remaining ref for tick detection
  const prevRemainingRef = useRef<number | null>(null);

  // Load sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: tick } = await Audio.Sound.createAsync(
          require('@/assets/sounds/tick.mp3'),
          { volume: 0.3 },
        );
        tickSoundRef.current = tick;
        const { sound: alarm } = await Audio.Sound.createAsync(
          require('@/assets/sounds/alarm.mp3'),
          { volume: 1.0 },
        );
        alarmSoundRef.current = alarm;
      } catch {}
    };
    loadSounds();
    return () => {
      tickSoundRef.current?.unloadAsync();
      alarmSoundRef.current?.unloadAsync();
    };
  }, []);

  // Play alarm when a timer finishes
  useEffect(() => {
    timers.forEach((timer) => {
      const isDone = timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.isRunning && !timer.isPaused;
      if (isDone && !finishedTimersRef.current.has(timer.id)) {
        finishedTimersRef.current.add(timer.id);
        alarmSoundRef.current?.setPositionAsync(0).then(() => alarmSoundRef.current?.playAsync()).catch(() => {});
      }
    });
  }, [timers]);

  // Clean finished refs when timer removed
  useEffect(() => {
    const ids = new Set(timers.map((t) => t.id));
    finishedTimersRef.current.forEach((id) => {
      if (!ids.has(id)) finishedTimersRef.current.delete(id);
    });
  }, [timers]);

  // Keep awake management
  useEffect(() => {
    if (keepAwake && (timers.some((t) => t.isRunning) || recipeTimerRunning)) {
      activateKeepAwake('timer-screen');
    } else {
      deactivateKeepAwake('timer-screen');
    }
    return () => { deactivateKeepAwake('timer-screen'); };
  }, [keepAwake, timers, recipeTimerRunning]);

  // Entry animation
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, []);

  // Active timer
  const activeTimer = useMemo(
    () => timers.find((t) => t.id === activeTimerId) ?? null,
    [timers, activeTimerId],
  );

  // Play tick sound each second
  useEffect(() => {
    if (!tickSound || !activeTimer || !activeTimer.isRunning) {
      prevRemainingRef.current = activeTimer?.remainingSeconds ?? null;
      return;
    }
    if (
      prevRemainingRef.current !== null &&
      activeTimer.remainingSeconds !== prevRemainingRef.current &&
      activeTimer.remainingSeconds > 0
    ) {
      tickSoundRef.current?.setPositionAsync(0).then(() => tickSoundRef.current?.playAsync()).catch(() => {});
    }
    prevRemainingRef.current = activeTimer.remainingSeconds;
  }, [activeTimer?.remainingSeconds, activeTimer?.isRunning, tickSound]);

  // Progress animation (SVG strokeDashoffset)
  useEffect(() => {
    if (activeTimer && activeTimer.totalSeconds > 0) {
      const progress = 1 - activeTimer.remainingSeconds / activeTimer.totalSeconds;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [activeTimer?.remainingSeconds, activeTimer?.totalSeconds]);

  // Pulse animation for running timer
  useEffect(() => {
    if (activeTimer?.isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeTimer?.isRunning]);

  // Tick all running timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((timer) => {
          if (!timer.isRunning) return timer;
          const remaining = Math.max(0, Math.round((timer.endTime - Date.now()) / 1000));
          if (remaining <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return { ...timer, remainingSeconds: 0, isRunning: false };
          }
          return { ...timer, remainingSeconds: remaining };
        }),
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const totalPickerSeconds = pickerHours * 3600 + pickerMinutes * 60 + pickerSeconds;

  const createTimer = useCallback(() => {
    if (totalPickerSeconds <= 0) return;
    const id = Date.now().toString();
    const newTimer: LocalTimer = {
      id,
      label: timerLabel.trim() || `${t('timerPageTitle')} ${timers.length + 1}`,
      totalSeconds: totalPickerSeconds,
      remainingSeconds: totalPickerSeconds,
      isRunning: true,
      isPaused: false,
      endTime: Date.now() + totalPickerSeconds * 1000,
      createdAt: Date.now(),
    };
    setTimers((prev) => [...prev, newTimer]);
    setActiveTimerId(id);
    setShowPicker(false);
    setTimerLabel('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [totalPickerSeconds, timerLabel, timers.length, t]);

  const pauseLocalTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id || !timer.isRunning) return timer;
        return {
          ...timer,
          isRunning: false,
          isPaused: true,
          remainingSeconds: Math.max(0, Math.round((timer.endTime - Date.now()) / 1000)),
        };
      }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resumeLocalTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id || !timer.isPaused) return timer;
        return {
          ...timer,
          isRunning: true,
          isPaused: false,
          endTime: Date.now() + timer.remainingSeconds * 1000,
        };
      }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const stopLocalTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    if (activeTimerId === id) {
      setActiveTimerId(null);
      setShowPicker(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [activeTimerId]);

  const resetLocalTimer = useCallback((id: string) => {
    finishedTimersRef.current.delete(id);
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return {
          ...timer,
          isRunning: true,
          isPaused: false,
          remainingSeconds: timer.totalSeconds,
          endTime: Date.now() + timer.totalSeconds * 1000,
        };
      }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const addTime = useCallback((id: string, seconds: number) => {
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        const newRemaining = Math.max(0, timer.remainingSeconds + seconds);
        const newTotal = timer.totalSeconds + seconds;
        return {
          ...timer,
          remainingSeconds: newRemaining,
          totalSeconds: newTotal > 0 ? newTotal : timer.totalSeconds,
          endTime: timer.isRunning ? timer.endTime + seconds * 1000 : timer.endTime,
        };
      }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const presets = [
    { label: '1 min', seconds: 60 },
    { label: '3 min', seconds: 180 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
    { label: '20 min', seconds: 1200 },
    { label: '30 min', seconds: 1800 },
    { label: '45 min', seconds: 2700 },
    { label: '1h', seconds: 3600 },
    { label: '1h30', seconds: 5400 },
    { label: '2h', seconds: 7200 },
    { label: '3h', seconds: 10800 },
  ];

  const cookingPresets = [
    { label: t('timerPresetBoilEgg'), icon: 'egg-outline' as const, seconds: 420 },
    { label: t('timerPresetPasta'), icon: 'restaurant-outline' as const, seconds: 600 },
    { label: t('timerPresetRice'), icon: 'leaf-outline' as const, seconds: 1200 },
    { label: t('timerPresetBraise'), icon: 'flame-outline' as const, seconds: 2700 },
    { label: t('timerPresetMarinade'), icon: 'time-outline' as const, seconds: 1800 },
    { label: t('timerPresetSauce'), icon: 'water-outline' as const, seconds: 2400 },
  ];

  const isDone = activeTimer && activeTimer.totalSeconds > 0 && activeTimer.remainingSeconds === 0 && !activeTimer.isRunning;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const progressColor = isDone
    ? colors.green
    : activeTimer?.isPaused
      ? '#FFC107'
      : colors.accent;

  // Number picker component
  const NumberPicker = ({
    value,
    onChange,
    max,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    max: number;
    label: string;
  }) => (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <TouchableOpacity
        onPress={() => onChange(value < max ? value + 1 : 0)}
        style={{
          width: 56,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="chevron-up" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.accent + '30',
        }}>
        <Text
          style={{
            fontSize: 36,
            fontWeight: '800',
            color: colors.text,
            fontVariant: ['tabular-nums'],
          }}>
          {value.toString().padStart(2, '0')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(value > 0 ? value - 1 : max)}
        style={{
          width: 56,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: 12,
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.chipBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 }}>
          {t('timerPageTitle')}
        </Text>
        {/* Tick sound toggle */}
        <TouchableOpacity
          onPress={() => {
            setTickSound(!tickSound);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: tickSound ? colors.accent + '20' : colors.chipBg,
          }}>
          <Ionicons
            name={tickSound ? 'volume-high' : 'volume-mute'}
            size={16}
            color={tickSound ? colors.accent : colors.textMuted}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: tickSound ? colors.accent : colors.textMuted,
            }}>
            {t('timerTickSound')}
          </Text>
        </TouchableOpacity>
        {/* Keep awake toggle */}
        <TouchableOpacity
          onPress={() => {
            setKeepAwake(!keepAwake);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: keepAwake ? colors.accent + '20' : colors.chipBg,
          }}>
          <Ionicons
            name={keepAwake ? 'eye' : 'eye-off'}
            size={16}
            color={keepAwake ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        {/* Recipe Timer Banners */}
        {recipeTimerList.map((entry) => (
          <View
            key={entry.id}
            style={{
              marginHorizontal: 20,
              marginBottom: 8,
              padding: 16,
              borderRadius: 20,
              backgroundColor: isDark ? '#2A1800' : '#FFF3E0',
              borderWidth: 1,
              borderColor: colors.accent + '30',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.accent + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="restaurant" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                  {t('timerRecipeTimer')}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {entry.recipeName}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: colors.accent,
                  fontVariant: ['tabular-nums'],
                }}>
                {formatTime(entry.remainingSeconds)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => (entry.isPaused ? resumeRecipeTimer(entry.id) : pauseRecipeTimer(entry.id))}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: colors.accent + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}>
                <Ionicons name={entry.isPaused ? 'play' : 'pause'} size={16} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
                  {entry.isPaused ? t('timerResume') : t('timerPause')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => stopRecipeTimer(entry.id)}
                style={{
                  height: 38,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: '#FF4444' + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="stop" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Picker / Active Timer Display */}
        {showPicker ? (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {/* Timer Label Input */}
            <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
              <TextInput
                value={timerLabel}
                onChangeText={setTimerLabel}
                placeholder={t('timerLabelPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: isDark ? colors.card : '#FFFFFF',
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            {/* Duration Picker */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginBottom: 28,
              }}>
              <NumberPicker value={pickerHours} onChange={setPickerHours} max={23} label={t('timerHours')} />
              <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textMuted, marginBottom: 28 }}>:</Text>
              <NumberPicker value={pickerMinutes} onChange={setPickerMinutes} max={59} label={t('timerMinutes')} />
              <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textMuted, marginBottom: 28 }}>:</Text>
              <NumberPicker value={pickerSeconds} onChange={setPickerSeconds} max={59} label={t('timerSeconds')} />
            </View>

            {/* Start Button */}
            <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
              <TouchableOpacity
                onPress={createTimer}
                disabled={totalPickerSeconds <= 0}
                style={{
                  height: 56,
                  borderRadius: 20,
                  backgroundColor: totalPickerSeconds > 0 ? colors.accent : colors.chipBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 10,
                  shadowColor: totalPickerSeconds > 0 ? colors.accent : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}>
                <Ionicons name="play" size={22} color={totalPickerSeconds > 0 ? '#FFFFFF' : colors.textMuted} />
                <Text style={{ fontSize: 17, fontWeight: '700', color: totalPickerSeconds > 0 ? '#FFFFFF' : colors.textMuted }}>
                  {t('timerStart')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                {t('timerQuickPresets')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.seconds}
                    onPress={() => {
                      const h = Math.floor(preset.seconds / 3600);
                      const m = Math.floor((preset.seconds % 3600) / 60);
                      const s = preset.seconds % 60;
                      setPickerHours(h);
                      setPickerMinutes(m);
                      setPickerSeconds(s);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 14,
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cooking Presets */}
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                {t('timerCookingPresets')}
              </Text>
              <View style={{ gap: 8 }}>
                {cookingPresets.map((preset) => (
                  <TouchableOpacity
                    key={preset.seconds}
                    onPress={() => {
                      setTimerLabel(preset.label);
                      const h = Math.floor(preset.seconds / 3600);
                      const m = Math.floor((preset.seconds % 3600) / 60);
                      const s = preset.seconds % 60;
                      setPickerHours(h);
                      setPickerMinutes(m);
                      setPickerSeconds(s);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: colors.accent + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name={preset.icon} size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                        {preset.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {formatTime(preset.seconds)}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={24} color={colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        ) : activeTimer ? (
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            {/* Timer Label */}
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: colors.textSecondary,
                marginBottom: 20,
              }}>
              {activeTimer.label}
            </Text>

            {/* Circular Progress with SVG */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View
                style={{
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Svg
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                  {/* Background track */}
                  <Circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    stroke={isDark ? colors.card : colors.border}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                  />
                  {/* Progress arc */}
                  <AnimatedCircle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    stroke={progressColor}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </Svg>
                {/* Inner content */}
                <View style={{ alignItems: 'center', gap: 4 }}>
                  {isDone ? (
                    <>
                      <Ionicons name="checkmark-circle" size={48} color={colors.green} />
                      <Text
                        style={{
                          fontSize: 32,
                          fontWeight: '900',
                          color: colors.green,
                          marginTop: 8,
                        }}>
                        {t('timerReady')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={{
                          fontSize: 52,
                          fontWeight: '900',
                          color: colors.text,
                          fontVariant: ['tabular-nums'],
                          letterSpacing: 2,
                        }}>
                        {formatTime(activeTimer.remainingSeconds)}
                      </Text>
                      {activeTimer.isPaused && (
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#FFC107',
                            marginTop: 4,
                          }}>
                          {t('timerPaused')}
                        </Text>
                      )}
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textMuted,
                          marginTop: 4,
                        }}>
                        {t('timerTotal')}: {formatTime(activeTimer.totalSeconds)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>

            {/* +/- Time Buttons */}
            {!isDone && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => addTime(activeTimer.id, -30)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.chipBg }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>-30s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addTime(activeTimer.id, -60)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.chipBg }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>-1 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addTime(activeTimer.id, 60)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.accent + '15' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>+1 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addTime(activeTimer.id, 300)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.accent + '15' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>+5 min</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Control Buttons */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24, alignItems: 'center' }}>
              {isDone ? (
                <>
                  <TouchableOpacity
                    onPress={() => resetLocalTimer(activeTimer.id)}
                    style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: colors.accent,
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
                    }}>
                    <Ionicons name="refresh" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => stopLocalTimer(activeTimer.id)}
                    style={{
                      width: 64, height: 64, borderRadius: 32,
                      backgroundColor: '#FF4444',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => resetLocalTimer(activeTimer.id)}
                    style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: colors.chipBg,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Ionicons name="refresh" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      activeTimer.isPaused
                        ? resumeLocalTimer(activeTimer.id)
                        : pauseLocalTimer(activeTimer.id)
                    }
                    style={{
                      width: 72, height: 72, borderRadius: 36,
                      backgroundColor: activeTimer.isPaused ? colors.accent : '#FFC107',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: activeTimer.isPaused ? colors.accent : '#FFC107',
                      shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35,
                      shadowRadius: 12, elevation: 8,
                    }}>
                    <Ionicons name={activeTimer.isPaused ? 'play' : 'pause'} size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(t('timerStopConfirmTitle'), t('timerStopConfirmMsg'), [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('timerStop'), style: 'destructive', onPress: () => stopLocalTimer(activeTimer.id) },
                      ])
                    }
                    style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: '#FF4444' + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Ionicons name="stop" size={22} color="#FF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* New timer button */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                marginTop: 28, paddingHorizontal: 20, paddingVertical: 12,
                borderRadius: 16, backgroundColor: colors.chipBg,
              }}>
              <Ionicons name="add-circle" size={20} color={colors.accent} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
                {t('timerAddNew')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="timer-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: 16, color: colors.textMuted, marginTop: 12 }}>
              {t('timerNoActive')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
                borderRadius: 16, backgroundColor: colors.accent,
              }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                {t('timerCreateNew')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Timers List */}
        {timers.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
              {t('timerActiveTimers')} ({timers.length})
            </Text>
            <View style={{ gap: 10 }}>
              {timers.map((timer) => {
                const timerDone = timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.isRunning;
                const isActive = timer.id === activeTimerId;
                const timerProgress = timer.totalSeconds > 0
                  ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
                  : 0;
                return (
                  <TouchableOpacity
                    key={timer.id}
                    onPress={() => { setActiveTimerId(timer.id); setShowPicker(false); }}
                    activeOpacity={0.7}
                    style={{
                      padding: 16, borderRadius: 18,
                      backgroundColor: isActive ? colors.accent + '12' : isDark ? colors.card : '#FFFFFF',
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? colors.accent : colors.border,
                      overflow: 'hidden',
                    }}>
                    <View
                      style={{
                        position: 'absolute', bottom: 0, left: 0,
                        width: `${timerProgress}%` as any, height: 3,
                        backgroundColor: timerDone ? colors.green : timer.isPaused ? '#FFC107' : colors.accent,
                        borderRadius: 2,
                      }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: timerDone ? colors.green + '20' : timer.isPaused ? '#FFC107' + '20' : colors.accent + '20',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Ionicons
                          name={timerDone ? 'checkmark-circle' : timer.isPaused ? 'pause-circle' : 'timer'}
                          size={20}
                          color={timerDone ? colors.green : timer.isPaused ? '#FFC107' : colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                          {timer.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {timerDone ? t('timerReady') : timer.isPaused ? t('timerPaused') : t('timerRunning')}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 22, fontWeight: '800',
                          color: timerDone ? colors.green : timer.isPaused ? '#FFC107' : colors.text,
                          fontVariant: ['tabular-nums'],
                        }}>
                        {timerDone ? '00:00' : formatTime(timer.remainingSeconds)}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {!timerDone && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              timer.isPaused ? resumeLocalTimer(timer.id) : pauseLocalTimer(timer.id);
                            }}
                            style={{
                              width: 32, height: 32, borderRadius: 16,
                              backgroundColor: colors.chipBg,
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                            <Ionicons name={timer.isPaused ? 'play' : 'pause'} size={14} color={colors.text} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); stopLocalTimer(timer.id); }}
                          style={{
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: '#FF4444' + '15',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                          <Ionicons name="close" size={14} color="#FF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stop All */}
            {timers.length > 1 && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(t('timerStopAllTitle'), t('timerStopAllMsg'), [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('confirm'),
                      style: 'destructive',
                      onPress: () => { setTimers([]); setActiveTimerId(null); setShowPicker(true); },
                    },
                  ])
                }
                style={{
                  marginTop: 12, height: 44, borderRadius: 14,
                  backgroundColor: '#FF4444' + '10',
                  alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 8,
                }}>
                <Ionicons name="trash-outline" size={18} color="#FF4444" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FF4444' }}>
                  {t('timerStopAll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
