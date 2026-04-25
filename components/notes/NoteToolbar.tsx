import React from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NoteBlockType } from '@/types';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  activeType: NoteBlockType | null;
  onSelect: (type: NoteBlockType) => void;
};

const ITEMS: { type: NoteBlockType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'paragraph', icon: 'reorder-three-outline' },
  { type: 'heading1', icon: 'text-outline' },
  { type: 'heading2', icon: 'text' },
  { type: 'bullet', icon: 'list-outline' },
  { type: 'numbered', icon: 'list' },
  { type: 'checklist', icon: 'checkbox-outline' },
];

export default function NoteToolbar({ activeType, onSelect }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View
      // Block touches from bubbling up to anything that could blur the focused input
      onStartShouldSetResponder={() => true}
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: isDark ? colors.card : '#FFFFFF',
      }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
        {ITEMS.map((item) => {
          const isActive = activeType === item.type;
          return (
            <Pressable
              key={item.type}
              // onPressIn fires on touch DOWN — before any potential blur cascade
              onPressIn={() => {
                Haptics.selectionAsync();
                onSelect(item.type);
              }}
              style={({ pressed }) => ({
                width: 44,
                height: 40,
                borderRadius: 12,
                backgroundColor: isActive ? `${colors.accent}25` : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
                borderWidth: isActive ? 1 : 0,
                borderColor: colors.accent,
              })}>
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? colors.accent : colors.text}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
