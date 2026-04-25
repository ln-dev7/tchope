import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Note } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { notePreview, formatRelativeDate } from './utils';

type Props = {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
};

export default function NoteCard({ note, onPress, onDelete }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const isFr = settings.language === 'fr';

  const title = note.title.trim() || t('untitledNote');
  const preview = notePreview(note);
  const date = formatRelativeDate(note.updatedAt, isFr);

  const confirmDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('deleteNoteConfirm'),
      t('deleteNoteMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: isDark ? colors.card : '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
            numberOfLines={1}>
            {title}
          </Text>
          {preview ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={2}>
              {preview}
            </Text>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
              {t('noteEmpty')}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{date}</Text>
        </View>
        <TouchableOpacity
          onPress={confirmDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(231,76,60,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="trash-outline" size={14} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
