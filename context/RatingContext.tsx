import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useTimer } from '@/context/TimerContext';

const RATING_KEY = 'tchope_rating';
const RECIPE_VIEW_COUNT_KEY = 'tchope_recipe_view_count';
const PROMPT_AT_VIEWS = [3, 6, 9, 12, 15];

type RatingState = {
  hasRated: boolean;
  dismissCount: number;
};

type RatingContextType = {
  trackRecipeView: () => void;
  requestRating: () => void;
  openStoreListing: () => void;
};

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id<YOUR_APP_ID>', // TODO: replace with real App Store ID
  android: 'https://play.google.com/store/apps/details?id=com.lndev.tchope',
}) as string;

const RatingContext = createContext<RatingContextType>({
  trackRecipeView: () => {},
  requestRating: () => {},
  openStoreListing: () => {},
});

export function useRating() {
  return useContext(RatingContext);
}

export function RatingProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { timer } = useTimer();
  const [showModal, setShowModal] = useState(false);
  const [ratingState, setRatingState] = useState<RatingState>({ hasRated: false, dismissCount: 0 });
  const loaded = useRef(false);
  const wasTimerRunning = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(RATING_KEY).then((val) => {
      if (val) setRatingState(JSON.parse(val));
      loaded.current = true;
    });
  }, []);

  const saveState = useCallback(async (state: RatingState) => {
    setRatingState(state);
    await AsyncStorage.setItem(RATING_KEY, JSON.stringify(state));
  }, []);

  const trackRecipeView = useCallback(async () => {
    if (!loaded.current || ratingState.hasRated) return;
    if (ratingState.dismissCount >= PROMPT_AT_VIEWS.length) return;

    const raw = await AsyncStorage.getItem(RECIPE_VIEW_COUNT_KEY);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(RECIPE_VIEW_COUNT_KEY, String(count));

    const nextPromptAt = PROMPT_AT_VIEWS[ratingState.dismissCount];
    if (count === nextPromptAt) {
      setShowModal(true);
    }
  }, [ratingState]);

  // Track when timer ends (finished or stopped)
  useEffect(() => {
    if (timer.isRunning) {
      wasTimerRunning.current = true;
    } else if (wasTimerRunning.current) {
      wasTimerRunning.current = false;
      trackRecipeView();
    }
  }, [timer.isRunning, trackRecipeView]);

  const openStoreListing = useCallback(async () => {
    try {
      await Linking.openURL(STORE_URL);
    } catch {
      // Silently fail if URL can't be opened
    }
    await saveState({ hasRated: true, dismissCount: ratingState.dismissCount });
  }, [saveState, ratingState.dismissCount]);

  const requestRating = useCallback(async () => {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      await StoreReview.requestReview();
    } else {
      await openStoreListing();
      return;
    }
    await saveState({ hasRated: true, dismissCount: ratingState.dismissCount });
  }, [saveState, ratingState.dismissCount, openStoreListing]);

  const handleRate = async () => {
    setShowModal(false);
    await requestRating();
  };

  const handleDismiss = async () => {
    setShowModal(false);
    await saveState({ hasRated: false, dismissCount: ratingState.dismissCount + 1 });
  };

  return (
    <RatingContext.Provider value={{ trackRecipeView, requestRating, openStoreListing }}>
      {children}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
          }}>
          <View
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderRadius: 32,
              padding: 32,
              width: '100%',
              alignItems: 'center',
              gap: 16,
            }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isDark ? 'rgba(245,158,66,0.15)' : 'rgba(145,71,0,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="star" size={32} color={colors.accent} />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: colors.text,
                textAlign: 'center',
                letterSpacing: -0.5,
              }}>
              {t('rateTitle')}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              }}>
              {t('rateMessage')}
            </Text>
            <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleRate}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 20,
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  {t('rateNow')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDismiss}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>
                  {t('rateLater')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </RatingContext.Provider>
  );
}
