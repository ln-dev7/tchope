import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  recipeName: string;
  onBack: () => void;
  isDark: boolean;
  colors: {
    text: string;
    surface: string;
    accent: string;
    border: string;
  };
};

export default function LiveCookingHeader({
  recipeName,
  onBack,
  isDark,
  colors,
}: Props) {
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={onBack}
        style={[styles.backButton, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text
          style={[styles.recipeName, { color: colors.text }]}
          numberOfLines={1}
        >
          {recipeName}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}12`,
          },
        ]}
      >
        <Ionicons name="mic" size={14} color={colors.accent} />
        <Text style={[styles.badgeText, { color: colors.accent }]}>Live</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
