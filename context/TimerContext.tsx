import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, AppState, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useRouter, usePathname } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { translations } from '@/constants/translations';

// Configure notification behavior (show even when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- Types ---

export type TimerEntry = {
  id: string;
  recipeId: string;
  recipeName: string;
  stepIndex?: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  endTime: number;
  notificationId?: string;
};

// Backward-compat shape for consumers that read the single "timer" property
type TimerState = {
  isRunning: boolean;
  recipeId: string;
  recipeName: string;
  totalSeconds: number;
  remainingSeconds: number;
  stepIndex?: number;
};

type TimerContextType = {
  timers: Map<string, TimerEntry>;
  startTimer: (recipeId: string, recipeName: string, durationSeconds: number, stepIndex?: number) => void;
  stopTimer: (timerId: string) => void;
  pauseTimer: (timerId: string) => void;
  resumeTimer: (timerId: string) => void;
  stopAllTimers: () => void;
  getTimersForRecipe: (recipeId: string) => TimerEntry[];
  isTimerRunning: boolean;
  // Backward compat
  timer: TimerState;
  isPaused: boolean;
};

const emptyTimer: TimerState = { isRunning: false, recipeId: '', recipeName: '', totalSeconds: 0, remainingSeconds: 0 };

const TimerContext = createContext<TimerContextType>({
  timers: new Map(),
  startTimer: () => {},
  stopTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  stopAllTimers: () => {},
  getTimersForRecipe: () => [],
  isTimerRunning: false,
  timer: emptyTimer,
  isPaused: false,
});

export function useTimer() {
  return useContext(TimerContext);
}

// --- Helpers ---

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

function makeTimerId(recipeId: string, stepIndex?: number): string {
  return `${recipeId}-${stepIndex ?? 'global'}`;
}

/** Return the timer with the least remaining time. Priority: running > paused > done. */
function pickWidgetTimer(timers: Map<string, TimerEntry>): TimerEntry | null {
  const all = Array.from(timers.values());
  const running = all.filter((t) => t.isRunning).sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  if (running.length > 0) return running[0];
  const paused = all.filter((t) => t.isPaused).sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  if (paused.length > 0) return paused[0];
  const done = all.filter((t) => t.totalSeconds > 0 && t.remainingSeconds === 0);
  if (done.length > 0) return done[0];
  return null;
}

// --- Provider ---

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Map<string, TimerEntry>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [minimized, setMinimized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { settings } = useSettings();
  const t = useCallback(
    (key: keyof typeof translations.fr) => translations[settings.language][key],
    [settings.language],
  );

  // --- Notifications (per-timer) ---

  const scheduleTimerNotification = useCallback(async (recipeName: string, seconds: number): Promise<string> => {
    if (seconds <= 0) return '';
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tchopé 🍳',
        body: `${recipeName} ${t('timerDone')}`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
    return identifier;
  }, [t]);

  const cancelTimerNotification = useCallback(async (notificationId?: string) => {
    if (notificationId) {
      try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch {}
    }
  }, []);

  useEffect(() => { Notifications.requestPermissionsAsync(); }, []);

  // --- Single interval: tick all running timers ---

  useEffect(() => {
    const hasActive = Array.from(timers.values()).some((e) => e.isRunning);
    if (hasActive) {
      intervalRef.current = setInterval(() => {
        setTimers((prev) => {
          const next = new Map(prev);
          let changed = false;
          for (const [id, entry] of next) {
            if (!entry.isRunning) continue;
            const remaining = Math.max(0, Math.round((entry.endTime - Date.now()) / 1000));
            if (remaining !== entry.remainingSeconds) {
              changed = true;
              if (remaining <= 0) {
                next.set(id, { ...entry, remainingSeconds: 0, isRunning: false });
              } else {
                next.set(id, { ...entry, remainingSeconds: remaining });
              }
            }
          }
          return changed ? next : prev;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timers]);

  // --- App state sync ---

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTimers((prev) => {
          const next = new Map(prev);
          let changed = false;
          for (const [id, entry] of next) {
            if (!entry.isRunning) continue;
            const remaining = Math.max(0, Math.round((entry.endTime - Date.now()) / 1000));
            if (remaining !== entry.remainingSeconds) {
              changed = true;
              next.set(id, remaining <= 0
                ? { ...entry, remainingSeconds: 0, isRunning: false }
                : { ...entry, remainingSeconds: remaining });
            }
          }
          return changed ? next : prev;
        });
      }
    });
    return () => sub.remove();
  }, []);

  // --- Timer completion detection ---

  useEffect(() => {
    for (const [id, entry] of timers) {
      if (entry.totalSeconds > 0 && entry.remainingSeconds === 0 && !entry.isRunning && !entry.isPaused && !completedRef.current.has(id)) {
        completedRef.current.add(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (pathname !== '/cooking-mode' && entry.recipeId) {
          const stepParam = entry.stepIndex != null ? `&step=${entry.stepIndex}` : '';
          router.push(`/cooking-mode?id=${entry.recipeId}${stepParam}` as any);
        }
        Alert.alert('Tchopé', `${entry.recipeName} ${t('timerDone')}`);
      }
    }
  }, [timers, t, pathname, router]);

  // --- Pulse animation ---

  useEffect(() => {
    const anyRunning = Array.from(timers.values()).some((e) => e.isRunning);
    if (anyRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timers, pulseAnim]);

  // --- Actions ---

  const startTimer = useCallback((recipeId: string, recipeName: string, durationSeconds: number, stepIndex?: number) => {
    const id = makeTimerId(recipeId, stepIndex);
    // Stop existing timer with same id if any
    setTimers((prev) => {
      const existing = prev.get(id);
      if (existing?.notificationId) cancelTimerNotification(existing.notificationId);
      const next = new Map(prev);
      next.set(id, {
        id, recipeId, recipeName, stepIndex,
        totalSeconds: durationSeconds,
        remainingSeconds: durationSeconds,
        isRunning: true,
        isPaused: false,
        endTime: Date.now() + durationSeconds * 1000,
      });
      return next;
    });
    completedRef.current.delete(id);
    setMinimized(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scheduleTimerNotification(recipeName, durationSeconds).then((notifId) => {
      if (notifId) {
        setTimers((prev) => {
          const entry = prev.get(id);
          if (!entry) return prev;
          const next = new Map(prev);
          next.set(id, { ...entry, notificationId: notifId });
          return next;
        });
      }
    });
  }, [cancelTimerNotification, scheduleTimerNotification]);

  const stopTimer = useCallback((timerId: string) => {
    setTimers((prev) => {
      const entry = prev.get(timerId);
      if (!entry) return prev;
      if (entry.notificationId) cancelTimerNotification(entry.notificationId);
      const next = new Map(prev);
      next.delete(timerId);
      return next;
    });
    completedRef.current.delete(timerId);
  }, [cancelTimerNotification]);

  const pauseTimer = useCallback((timerId: string) => {
    setTimers((prev) => {
      const entry = prev.get(timerId);
      if (!entry || !entry.isRunning) return prev;
      if (entry.notificationId) cancelTimerNotification(entry.notificationId);
      const remaining = Math.max(0, Math.round((entry.endTime - Date.now()) / 1000));
      const next = new Map(prev);
      next.set(timerId, { ...entry, isRunning: false, isPaused: true, remainingSeconds: remaining });
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [cancelTimerNotification]);

  const resumeTimer = useCallback((timerId: string) => {
    setTimers((prev) => {
      const entry = prev.get(timerId);
      if (!entry || !entry.isPaused) return prev;
      const newEndTime = Date.now() + entry.remainingSeconds * 1000;
      const next = new Map(prev);
      next.set(timerId, { ...entry, isRunning: true, isPaused: false, endTime: newEndTime });
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Re-schedule notification
    const entry = timers.get(timerId);
    if (entry) {
      scheduleTimerNotification(entry.recipeName, entry.remainingSeconds).then((notifId) => {
        if (notifId) {
          setTimers((prev) => {
            const e = prev.get(timerId);
            if (!e) return prev;
            const next = new Map(prev);
            next.set(timerId, { ...e, notificationId: notifId });
            return next;
          });
        }
      });
    }
  }, [timers, scheduleTimerNotification]);

  const stopAllTimers = useCallback(() => {
    for (const entry of timers.values()) {
      if (entry.notificationId) cancelTimerNotification(entry.notificationId);
    }
    setTimers(new Map());
    completedRef.current.clear();
  }, [timers, cancelTimerNotification]);

  const getTimersForRecipe = useCallback((recipeId: string): TimerEntry[] => {
    return Array.from(timers.values()).filter((e) => e.recipeId === recipeId);
  }, [timers]);

  // --- Derived (backward compat) ---

  const allTimers = Array.from(timers.values());
  const isTimerRunning = allTimers.length > 0;
  const widgetTimer = pickWidgetTimer(timers);
  const timer: TimerState = widgetTimer
    ? { isRunning: widgetTimer.isRunning, recipeId: widgetTimer.recipeId, recipeName: widgetTimer.recipeName, totalSeconds: widgetTimer.totalSeconds, remainingSeconds: widgetTimer.remainingSeconds, stepIndex: widgetTimer.stepIndex }
    : emptyTimer;
  const isPaused = widgetTimer?.isPaused ?? false;

  const isOnCookingMode = pathname === '/cooking-mode';
  const widgetDone = widgetTimer ? widgetTimer.totalSeconds > 0 && widgetTimer.remainingSeconds === 0 && !widgetTimer.isRunning && !widgetTimer.isPaused : false;
  const widgetProgress = widgetTimer && widgetTimer.totalSeconds > 0 ? (widgetTimer.totalSeconds - widgetTimer.remainingSeconds) / widgetTimer.totalSeconds : 0;
  const activeCount = allTimers.length;

  const handleGoToCookingMode = () => {
    if (widgetTimer?.recipeId) {
      const stepParam = widgetTimer.stepIndex != null ? `&step=${widgetTimer.stepIndex}` : '';
      router.push(`/cooking-mode?id=${widgetTimer.recipeId}${stepParam}` as any);
    }
  };

  return (
    <TimerContext.Provider value={{ timers, startTimer, stopTimer, pauseTimer, resumeTimer, stopAllTimers, getTimersForRecipe, isTimerRunning, timer, isPaused }}>
      {children}

      {/* Floating widget — shows the timer with least remaining time */}
      {isTimerRunning && !isOnCookingMode && widgetTimer && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 110,
            left: 20,
            transform: [{ scale: pulseAnim }],
            zIndex: 9999,
          }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setMinimized(!minimized)}
            style={{
              backgroundColor: widgetDone ? '#0A6A1D' : widgetTimer.isPaused ? '#6B5B00' : '#914700',
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
                <Ionicons name={widgetDone ? 'checkmark-circle' : widgetTimer.isPaused ? 'pause-circle' : 'timer-outline'} size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
                  {widgetDone ? '!' : formatTime(widgetTimer.remainingSeconds)}
                </Text>
                {activeCount > 1 && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>+{activeCount - 1}</Text>
                  </View>
                )}
                <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            ) : (
              <View style={{ gap: 8, alignItems: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={widgetDone ? 'checkmark-circle' : widgetTimer.isPaused ? 'pause-circle' : 'timer-outline'} size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
                    {widgetTimer.isPaused ? `${truncateName(widgetTimer.recipeName)} (${t('timerPaused')})` : truncateName(widgetTimer.recipeName)}
                  </Text>
                  {activeCount > 1 && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>+{activeCount - 1}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
                  {widgetDone ? t('timerReady') : formatTime(widgetTimer.remainingSeconds)}
                </Text>
                {!widgetDone && (
                  <View style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <View style={{ width: `${widgetProgress * 100}%`, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 }} />
                  </View>
                )}
                {!widgetDone && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); if (widgetTimer.isPaused) resumeTimer(widgetTimer.id); else pauseTimer(widgetTimer.id); }}
                      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)' }}>
                      <Ionicons name={widgetTimer.isPaused ? 'play' : 'pause'} size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); stopTimer(widgetTimer.id); }}
                      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                      <Ionicons name="stop" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    {widgetTimer.recipeId && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleGoToCookingMode(); }}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {widgetDone && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); stopTimer(widgetTimer.id); }}
                      style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{t('timerClose')}</Text>
                    </TouchableOpacity>
                    {widgetTimer.recipeId && (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleGoToCookingMode(); }}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }}>
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
