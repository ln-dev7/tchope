import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ClipboardModule from 'expo-clipboard';
import type { Recipe, UserRecipe, Note } from '@/types';
import type { Message } from './types';
import MiniRecipeCard from './MiniRecipeCard';
import MiniNoteCard from './MiniNoteCard';
import SaveRecipeButton from './SaveRecipeButton';
import SaveNoteButton from './SaveNoteButton';

type Props = {
  item: Message;
  colors: any;
  isDark: boolean;
  isFr: boolean;
  recipes: Recipe[];
  userRecipes: UserRecipe[];
  notes: Note[];
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
  onRecipePress: (id: string) => void;
  onNotePress: (id: string) => void;
  onSaveRecipe: (r: UserRecipe) => void;
  onSaveNote: (n: Note) => void;
  t: (k: any) => string;
};

export default function ChatMessage({
  item, colors, isDark, isFr, recipes, userRecipes, notes,
  copiedId, setCopiedId, onRecipePress, onNotePress, onSaveRecipe, onSaveNote, t,
}: Props) {
  if (item.role === 'info') {
    return (
      <View style={{ alignSelf: 'center', marginBottom: 8, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          {item.content}
        </Text>
      </View>
    );
  }

  const isUser = item.role === 'user';
  const linkedRecipes = (item.recipeIds ?? [])
    .map((id) => recipes.find((r) => r.id === id))
    .filter(Boolean) as Recipe[];
  const linkedNotes = (item.noteIds ?? [])
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as Note[];

  return (
    <View style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '82%',
      marginBottom: 12,
    }}>
      <View style={{
        backgroundColor: isUser
          ? colors.accent
          : isDark ? '#2A2A2A' : '#F3F0EF',
        borderRadius: 20,
        borderBottomRightRadius: isUser ? 6 : 20,
        borderBottomLeftRadius: isUser ? 20 : 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}>
        <Text style={{
          fontSize: 15,
          lineHeight: 22,
          color: isUser ? '#FFFFFF' : colors.text,
        }}>
          {item.content}
        </Text>
      </View>
      {!isUser && item.id !== 'welcome' && (
        <TouchableOpacity
          onPress={() => {
            ClipboardModule.setStringAsync(item.content);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 1500);
          }}
          style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={copiedId === item.id ? 'checkmark' : 'copy-outline'} size={14} color={copiedId === item.id ? colors.green : colors.textMuted} />
          {copiedId === item.id && (
            <Text style={{ fontSize: 11, color: colors.green, fontWeight: '600' }}>
              {isFr ? 'Copié' : 'Copied'}
            </Text>
          )}
        </TouchableOpacity>
      )}
      {linkedRecipes.length > 0 && (
        <View style={{ gap: 6, marginTop: 8 }}>
          {linkedRecipes.map((recipe) => (
            <MiniRecipeCard
              key={recipe.id}
              recipe={recipe}
              isDark={isDark}
              colors={colors}
              onPress={() => onRecipePress(recipe.id)}
            />
          ))}
        </View>
      )}
      {linkedNotes.length > 0 && (
        <View style={{ gap: 6, marginTop: 8 }}>
          {linkedNotes.map((note) => (
            <MiniNoteCard
              key={note.id}
              note={note}
              isDark={isDark}
              colors={colors}
              onPress={() => onNotePress(note.id)}
              untitledLabel={t('untitledNote')}
            />
          ))}
        </View>
      )}
      {item.saveRecipe && (
        <SaveRecipeButton
          recipe={item.saveRecipe}
          isDark={isDark}
          colors={colors}
          onSave={onSaveRecipe}
          alreadySaved={userRecipes.some((r) => r.id === item.saveRecipe!.id)}
          t={t}
        />
      )}
      {item.saveNote && (
        <SaveNoteButton
          note={item.saveNote}
          isDark={isDark}
          colors={colors}
          onSave={onSaveNote}
          alreadySaved={notes.some((n) => n.id === item.saveNote!.id)}
          t={t}
        />
      )}
    </View>
  );
}
