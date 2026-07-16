import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REWARDED_FAILOPEN_DELAY_MS } from '@/constants/ads';

/** Modale « 1 pub = 1 action » (recherche libre, génération/ajustement de
 *  plan…). FAIL-OPEN : si la pub n'a pas chargé après
 *  REWARDED_FAILOPEN_DELAY_MS (pas de remplissage, panne AdMob…),
 *  « Continuer sans pub » exécute quand même l'action — la régie ne doit
 *  jamais bloquer une fonctionnalité. `capped` = plafond quotidien de pubs
 *  atteint (utils/adQuota.ts) → on invite à revenir demain. */

type Props = {
  visible: boolean;
  title: string;
  text: string;
  ready: boolean;
  capped: boolean;
  colors: any;
  isDark: boolean;
  onWatch: () => void;
  onContinue: () => void;
  onClose: () => void;
  t: (k: any) => string;
};

export default function RewardedUnlockModal({
  visible, title, text, ready, capped, colors, isDark,
  onWatch, onContinue, onClose, t,
}: Props) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!visible) {
      setElapsed(false);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), REWARDED_FAILOPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);
  const showFailOpen = !capped && elapsed && !ready;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', borderRadius: 24, padding: 24, gap: 14, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play-circle-outline" size={28} color={colors.accent} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{title}</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            {capped ? t('adDailyLimitReached') : text}
          </Text>
          {!capped && (
            <TouchableOpacity
              onPress={onWatch}
              disabled={!ready}
              style={{ backgroundColor: ready ? colors.accent : colors.surface, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' }}>
              {ready ? (
                <Ionicons name="play" size={16} color="#FFFFFF" />
              ) : (
                <ActivityIndicator size="small" color={colors.textMuted} />
              )}
              <Text style={{ fontSize: 15, fontWeight: '700', color: ready ? '#FFFFFF' : colors.textMuted }}>
                {ready ? t('adUnlockWatch') : t('aiAdLoading')}
              </Text>
            </TouchableOpacity>
          )}
          {showFailOpen && (
            <TouchableOpacity onPress={onContinue} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' }}>
                {t('adContinueNoAd')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
