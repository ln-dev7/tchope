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
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityState={{ selected: active }}
      onPress={onPress}
      activeOpacity={0.7}
      style={{ alignItems: 'center', gap: 8, width: 86 }}>
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 20,
          backgroundColor: active ? colors.accent : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons
          name={regionIcons[region] as any}
          size={22}
          color={active ? colors.onAccent : colors.accent}
        />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: active ? colors.accent : colors.textSecondary,
          textAlign: 'center',
        }}
        numberOfLines={2}>
        {region}
      </Text>
    </TouchableOpacity>
  );
}
