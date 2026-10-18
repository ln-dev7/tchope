import React from 'react';
import { Text, View } from 'react-native';
import { usePro } from '@/context/ProContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProBadge() {
  const { pro } = usePro();
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (!pro) return null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('proBadgeLabel')}
      style={{ alignSelf: 'center', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: colors.onAccent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>PRO</Text>
    </View>
  );
}
