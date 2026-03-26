import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, AppState, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, usePathname } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { translations } from '@/constants/translations';

type TimerState = {
  isRunning: boolean;
  recipeId: string;
  recipeName: string;
  totalSeconds: number;
  remainingSeconds: number;
};

type TimerContextType = {
  timer: TimerState;
  startTimer: (recipeId: string, recipeName: string, durationMinutes: number) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  isPaused: boolean;
  isTimerRunning: boolean;
};

const TimerContext = createContext<TimerContextType>({
  timer: { isRunning: false, recipeId: '', recipeName: '', totalSeconds: 0, remainingSeconds: 0 },
  startTimer: () => {},
  stopTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  isPaused: false,
  isTimerRunning: false,
});

export function useTimer() {
  return useContext(TimerContext);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function truncateName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '...';
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    recipeId: '',
    recipeName: '',
    totalSeconds: 0,
    remainingSeconds: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [minimized, setMinimized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pausedRemainingRef = useRef<number>(0);
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const t = useCallback(
    (key: keyof typeof translations.fr) => translations[settings.language][key],
    [settings.language],
  );

  // Countdown based on real clock
  useEffect(() => {
    if (timer.isRunning && timer.remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setTimer((prev) => {
          if (remaining <= 0) {
            return { ...prev, remainingSeconds: 0, isRunning: false };
          }
          return { ...prev, remainingSeconds: remaining };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning]);

  // Sync timer when app comes back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && timer.isRunning && endTimeRef.current > 0) {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          setTimer((prev) => ({ ...prev, remainingSeconds: 0, isRunning: false }));
        } else {
          setTimer((prev) => ({ ...prev, remainingSeconds: remaining }));
        }
      }
    });
    return () => sub.remove();
  }, [timer.isRunning]);

  // Timer done
  useEffect(() => {
    if (timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.isRunning) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Tchopé', `${timer.recipeName} ${t('timerDone')}`);
    }
  }, [timer.remainingSeconds, timer.isRunning, timer.recipeName, timer.totalSeconds, t]);

  // Pulse animation
  useEffect(() => {
    if (timer.isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timer.isRunning, pulseAnim]);

  const startTimer = useCallback((recipeId: string, recipeName: string, durationMinutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const totalSeconds = durationMinutes * 60;
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    setTimer({ isRunning: true, recipeId, recipeName, totalSeconds, remainingSeconds: totalSeconds });
    setMinimized(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pausedRemainingRef.current = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
    setIsPaused(true);
    setTimer((prev) => ({ ...prev, isRunning: false }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resumeTimer = useCallback(() => {
    endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
    setIsPaused(false);
    setTimer((prev) => ({ ...prev, isRunning: true, remainingSeconds: pausedRemainingRef.current }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endTimeRef.current = 0;
    pausedRemainingRef.current = 0;
    setIsPaused(false);
    setTimer({ isRunning: false, recipeId: '', recipeName: '', totalSeconds: 0, remainingSeconds: 0 });
  }, []);

  const progress = timer.totalSeconds > 0 ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds : 0;
  const isTimerRunning = timer.isRunning || isPaused || (timer.totalSeconds > 0 && timer.remainingSeconds === 0);
  const isDone = timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.isRunning && !isPaused;
  const isOnRecipePage = pathname === `/recipe/${timer.recipeId}`;

  const handleGoToRecipe = () => {
    if (timer.recipeId) {
      router.push(`/recipe/${timer.recipeId}`);
    }
  };

  return (
    <TimerContext.Provider value={{ timer, startTimer, stopTimer, pauseTimer, resumeTimer, isPaused, isTimerRunning }}>
      {children}

      {isTimerRunning && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 110,
            right: 20,
            transform: [{ scale: pulseAnim }],
            zIndex: 9999,
          }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setMinimized(!minimized)}
            style={{
              backgroundColor: isDone ? '#0A6A1D' : isPaused ? '#6B5B00' : '#914700',
              borderRadius: minimized ? 32 : 24,
              padding: minimized ? 14 : 16,
              minWidth: minimized ? 64 : 200,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}>
            {minimized ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={isDone ? 'checkmark-circle' : isPaused ? 'pause-circle' : 'timer-outline'} size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
                  {isDone ? '!' : formatTime(timer.remainingSeconds)}
                </Text>
                <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            ) : (
              <View style={{ gap: 8, alignItems: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={isDone ? 'checkmark-circle' : isPaused ? 'pause-circle' : 'timer-outline'} size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                    {isPaused ? `${truncateName(timer.recipeName)} (${t('timerPaused')})` : truncateName(timer.recipeName)}
                  </Text>
                </View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
                  {isDone ? t('timerReady') : formatTime(timer.remainingSeconds)}
                </Text>
                {!isDone && (
                  <View style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 }} />
                  </View>
                )}
                {!isDone && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); if (isPaused) { resumeTimer(); } else { pauseTimer(); } }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                      }}>
                      <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); stopTimer(); }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                      }}>
                      <Ionicons name="stop" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    {!isOnRecipePage && timer.recipeId && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleGoToRecipe(); }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                        }}>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {isDone && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); stopTimer(); }}
                      style={{
                        paddingHorizontal: 16,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{t('timerClose')}</Text>
                    </TouchableOpacity>
                    {!isOnRecipePage && timer.recipeId && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleGoToRecipe(); }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                        }}>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </TimerContext.Provider>
  );
}
