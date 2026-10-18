import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { type } from '@/constants/design';

export default function PageIntro({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Text accessibilityRole="header" style={[type.title, { flex: 1, color: colors.text }]}>{title}</Text>
        {action}
      </View>
      {subtitle ? <Text style={[type.body, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}
