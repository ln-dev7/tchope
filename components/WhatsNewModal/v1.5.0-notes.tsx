import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { TranslationKey } from '@/constants/translations';

// The version this release file announces. The shell uses it to decide whether
// to show the modal (compared against the running app version).
export const RELEASE_VERSION = '1.5.0';

type Props = {
  colors: any;
  isDark: boolean;
  t: (key: TranslationKey) => string;
  onClose: () => Promise<void> | void;
};

export default function NotesReleaseContent({ colors, t, onClose }: Props) {
  const router = useRouter();

  const goToNotes = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onClose();
    router.push('/notes' as any);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}>
      {/* Hero icon */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: `${colors.accent}18`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="document-text" size={40} color={colors.accent} />
        </View>
      </View>

      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.accent,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
        }}>
        {t('whatsNewLabel')}
      </Text>

      <Text
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.text,
          textAlign: 'center',
          marginBottom: 12,
          letterSpacing: -0.5,
        }}>
        {t('whatsNewTitle')}
      </Text>

      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24,
          paddingHorizontal: 8,
        }}>
        {t('whatsNewDescription')}
      </Text>

      <View style={{ gap: 14, marginBottom: 28 }}>
        <FeatureRow
          icon="create-outline"
          colors={colors}
          title={t('whatsNewFeature1Title')}
          description={t('whatsNewFeature1Desc')}
        />
        <FeatureRow
          icon="list-outline"
          colors={colors}
          title={t('whatsNewFeature2Title')}
          description={t('whatsNewFeature2Desc')}
        />
        <FeatureRow
          icon="sparkles-outline"
          colors={colors}
          title={t('whatsNewFeature3Title')}
          description={t('whatsNewFeature3Desc')}
        />
      </View>

      <TouchableOpacity
        onPress={goToNotes}
        activeOpacity={0.85}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 8,
        }}>
        <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
          {t('whatsNewCta')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ paddingVertical: 12 }}>
        <Text
          style={{
            fontSize: 14,
            color: colors.textMuted,
            fontWeight: '500',
            textAlign: 'center',
          }}>
          {t('whatsNewLater')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FeatureRow({ icon, title, description, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: `${colors.accent}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
