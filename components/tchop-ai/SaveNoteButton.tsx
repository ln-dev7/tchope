import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Note } from '@/types';

export default function SaveNoteButton({ note, isDark, colors, onSave, alreadySaved, t }: {
  note: Note; isDark: boolean; colors: any;
  onSave: (n: Note) => void; alreadySaved: boolean; t: (k: any) => string;
}) {
  const [saved, setSaved] = React.useState(alreadySaved);

  const handlePress = () => {
    if (saved) return;
    onSave(note);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={saved}
      activeOpacity={0.8}
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: saved
          ? (isDark ? '#2A2A2A' : '#F3F0EF')
          : colors.accent,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}>
      <Ionicons
        name={saved ? 'checkmark-circle' : 'document-text-outline'}
        size={18}
        color={saved ? colors.textMuted : '#FFFFFF'}
      />
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: saved ? colors.textMuted : '#FFFFFF',
      }}>
        {saved ? t('noteSaved') : t('addNote')}
      </Text>
    </TouchableOpacity>
  );
}
