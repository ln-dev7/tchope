import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import TchopePlusScreen from './TchopePlusScreen';

const FEATURES = [
  { icon: 'mic-outline', key: 'liveExplainFeature1' },
  { icon: 'camera-outline', key: 'liveExplainFeature2' },
  { icon: 'hand-left-outline', key: 'liveExplainFeature3' },
] as const;

export default function LiveExplainScreen({ onClose }: { onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [showPlusModal, setShowPlusModal] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
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
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {t('liveExplainCta')}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setShowPlusModal(true)}
        activeOpacity={0.85}
        style={{
          marginTop: 12,
          backgroundColor: colors.accent,
          borderRadius: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
          {t('upgradeToPremium')}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />

      <Modal visible={showPlusModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TchopePlusScreen onClose={() => setShowPlusModal(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}
