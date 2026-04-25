import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from '@/types';
import { notePreview } from '@/components/notes/utils';

export default function MiniNoteCard({ note, isDark, colors, onPress, untitledLabel }: {
  note: Note; isDark: boolean; colors: any; onPress: () => void; untitledLabel: string;
}) {
  const title = note.title.trim() || untitledLabel;
  const preview = notePreview(note, 60);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: isDark ? '#3A3A3A' : '#E8E5E4',
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${colors.accent}15`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="document-text-outline" size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
        {preview ? (
          <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
            {preview}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
