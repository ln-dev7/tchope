import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotes } from '@/context/NotesContext';
import EmptyState from '@/components/EmptyState';
import NoteCard from '@/components/notes/NoteCard';

export default function NotesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { notes, deleteNote } = useNotes();

  const sortedNotes = [...notes].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  const handleNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/note/new' as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 12,
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
            {t('myNotes')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {t('notesCount').replace('{count}', String(notes.length))}
          </Text>
        </View>
        {sortedNotes.length > 0 && (
          <TouchableOpacity
            onPress={handleNew}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {sortedNotes.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="document-text-outline"
            title={t('noNotes')}
            subtitle={t('noNotesSubtitle')}
          />
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleNew}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 16,
                paddingHorizontal: 24,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {t('addNote')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: bottom + 20, gap: 12 }}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onPress={() => router.push(`/note/${item.id}` as any)}
              onDelete={() => deleteNote(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
