import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = { label: string; active?: boolean; onPress?: () => void; variant?: 'default' | 'peach' | 'green' };
export default function CategoryChip({ label, active = false, onPress, variant = 'default' }: Props) {
  const { colors } = useTheme();
  const green = variant === 'green';
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} activeOpacity={0.75}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 17, paddingVertical: 11, borderRadius: 12, borderWidth: 1,
        borderColor: active ? (green ? colors.green : colors.accent) : colors.border,
        backgroundColor: active ? (green ? colors.greenLight : colors.chipActiveBg) : colors.card }}>
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', textAlign: 'center', color: active ? (green ? colors.greenText : colors.chipActiveText) : colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );
}
