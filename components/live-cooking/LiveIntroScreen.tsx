import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

const FEATURES = [
  { icon: 'mic-outline', key: 'liveExplainFeature1' },
  { icon: 'camera-outline', key: 'liveExplainFeature2' },
  { icon: 'hand-left-outline', key: 'liveExplainFeature3' },
] as const;

/** Écran d'introduction TchopAI Live : présente le fonctionnement du mode
 *  (guidage vocal, photo, temps réel) avant de démarrer la session.
 *  Remplace l'ancien portail rewarded LiveUnlockScreen (pubs supprimées —
 *  voir ADS_RESTORE.md pour le rétablir). */
export default function LiveIntroScreen({ onClose, onStart }: {
  onClose: () => void;
  onStart: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart();
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
      <TouchableOpacity
        onPress={handleStart}
        activeOpacity={0.85}
        style={{
          marginTop: 32,
          backgroundColor: colors.accent,
          borderRadius: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="play" size={18} color="#FFFFFF" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
          {t('liveStartCta')}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
