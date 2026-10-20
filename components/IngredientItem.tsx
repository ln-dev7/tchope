import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const ingredientIcons: Record<string, string> = {
  Igname: 'nutrition-outline',
  Plantain: 'leaf-outline',
  Manioc: 'flower-outline',
  Gombo: 'rose-outline',
  Ndolé: 'leaf-outline',
  Arachides: 'ellipse-outline',
};

type Props = {
  name: string;
  active?: boolean;
  onPress?: () => void;
};

export default function IngredientItem({ name, active = false, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityState={{ selected: active }}
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: active ? colors.accent : colors.card,
        borderRadius: 18,
        borderWidth: 1, borderColor: active ? colors.accent : colors.border,
        padding: 12,
        alignItems: 'center',
        gap: 12,
        flex: 1,
      }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: active ? colors.activeIngredient : colors.ingredientBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons
          name={(ingredientIcons[name] || 'nutrition-outline') as any}
          size={22}
          color={active ? colors.onAccent : colors.accent}
        />
      </View>
      <Text
        style={{
          fontSize: 13, textAlign: 'center',
          fontWeight: '600',
          color: active ? colors.onAccent : colors.textSecondary,
        }}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}
