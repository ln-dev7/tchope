import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { Region } from '@/types';

const regionIcons: Record<Region, string> = {
  Littoral: 'water-outline',
  Ouest: 'triangle-outline',
  Centre: 'business-outline',
  Sud: 'compass-outline',
  Nord: 'sunny-outline',
  Est: 'leaf-outline',
  Adamaoua: 'trail-sign-outline',
  'Extrême-Nord': 'thermometer-outline',
  'Nord-Ouest': 'map-outline',
  'Sud-Ouest': 'boat-outline',
  TchopAI: 'sparkles-outline',
};

type Props = {
  region: Region;
  active?: boolean;
  onPress?: () => void;
};

export default function RegionItem({ region, active = false, onPress }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ alignItems: 'center', gap: 8, width: 80 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: active ? colors.accent : (isDark ? colors.surface : colors.surface),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons
          name={regionIcons[region] as any}
          size={22}
          color={active ? '#FFFFFF' : colors.textSecondary}
        />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: active ? colors.accent : colors.textSecondary,
          textAlign: 'center',
        }}
        numberOfLines={1}>
        {region}
      </Text>
    </TouchableOpacity>
  );
}
