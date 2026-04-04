import React from 'react';
import { View, Text } from 'react-native';

import { useLicense } from '@/context/LicenseContext';
import { useTheme } from '@/hooks/useTheme';

export default function PremiumBadge() {
  const { isPremium } = useLicense();
  const { colors } = useTheme();

  if (isPremium) return null;

  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
        PLUS
      </Text>
    </View>
  );
}
