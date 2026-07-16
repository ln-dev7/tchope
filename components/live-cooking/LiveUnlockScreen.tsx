import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { AD_UNITS, REWARDED_FAILOPEN_DELAY_MS } from '@/constants/ads';
import { canWatchRewarded, recordRewardedView } from '@/utils/adQuota';

const FEATURES = [
  { icon: 'mic-outline', key: 'liveExplainFeature1' },
  { icon: 'camera-outline', key: 'liveExplainFeature2' },
  { icon: 'hand-left-outline', key: 'liveExplainFeature3' },
] as const;

/** Portail « 1 pub = 1 session Live » — Live est le placement le plus cher en
 *  API, la session n'est débloquée que pour la durée de l'écran courant.
 *  FAIL-OPEN : si la pub n'a pas chargé après REWARDED_FAILOPEN_DELAY_MS, on
 *  laisse démarrer la session sans pub — la régie ne bloque jamais la cuisine.
 *  Plafond quotidien partagé (utils/adQuota.ts) : atteint → revenir demain. */
export default function LiveUnlockScreen({ onClose, onUnlocked }: {
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const rewardedAd = useRewardedAd(AD_UNITS.rewardedLive);
  const [capped, setCapped] = useState(false);
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    canWatchRewarded().then((ok) => setCapped(!ok));
    const timer = setTimeout(() => setElapsed(true), REWARDED_FAILOPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const showFailOpen = !capped && elapsed && !rewardedAd.ready;

  const handleWatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rewardedAd.show(() => {
      recordRewardedView();
      onUnlocked();
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: top + 8, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Close */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Icon */}
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="mic" size={40} color="#A855F7" />
        </View>
      </View>

      {/* Title + Description */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          textAlign: 'center',
          letterSpacing: -0.5,
          marginTop: 20,
        }}
      >
        {t('liveExplainTitle')}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 12,
          lineHeight: 22,
          paddingHorizontal: 8,
        }}
      >
        {t('liveExplainDesc')}
      </Text>

      {/* Features */}
      <View style={{ marginTop: 32, gap: 16 }}>
        {FEATURES.map((f) => (
          <View
            key={f.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={f.icon as any} size={20} color="#A855F7" />
            </View>
            <Text style={{ fontSize: 15, color: colors.text, flex: 1, fontWeight: '500' }}>
              {t(f.key as any)}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={{ marginTop: 32, alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
          {capped ? t('adDailyLimitReached') : t('liveUnlockCta')}
        </Text>
      </View>

      {!capped && (
        <TouchableOpacity
          onPress={handleWatch}
          disabled={!rewardedAd.ready}
          activeOpacity={0.85}
          style={{
            marginTop: 12,
            backgroundColor: rewardedAd.ready ? colors.accent : colors.surface,
            borderRadius: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {rewardedAd.ready ? (
            <Ionicons name="play" size={18} color="#FFFFFF" />
          ) : (
            <ActivityIndicator size="small" color={colors.textMuted} />
          )}
          <Text style={{ fontSize: 16, fontWeight: '700', color: rewardedAd.ready ? '#FFFFFF' : colors.textMuted }}>
            {rewardedAd.ready ? t('adUnlockWatch') : t('aiAdLoading')}
          </Text>
        </TouchableOpacity>
      )}

      {showFailOpen && (
        <TouchableOpacity onPress={onUnlocked} style={{ marginTop: 16, alignItems: 'center' }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' }}>
            {t('adContinueNoAd')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
