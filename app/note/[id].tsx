import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  Keyboard,
  Alert,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotes, createEmptyBlock, createEmptyNote } from '@/context/NotesContext';
import type { Note, NoteBlock as NoteBlockData, NoteBlockType } from '@/types';
import NoteBlock from '@/components/notes/NoteBlock';
import NoteToolbar from '@/components/notes/NoteToolbar';
import { isNoteEmpty } from '@/components/notes/utils';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { getNote, addNote, updateNote, deleteNote } = useNotes();

  const isNew = !id || id === 'new';
  const existing = !isNew ? getNote(id as string) : undefined;

  const [note, setNote] = useState<Note>(() => existing ?? createEmptyNote());
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const blockRefs = useRef<Record<string, TextInput | null>>({});
  const focusBlockIdRef = useRef<string | null>(null);
  const persistedRef = useRef<boolean>(false);

  // Focus a block after re-render (used when splitting / adding blocks)
  useEffect(() => {
    if (focusBlockIdRef.current) {
      const target = blockRefs.current[focusBlockIdRef.current];
      target?.focus();
      setActiveBlockId(focusBlockIdRef.current);
      focusBlockIdRef.current = null;
    }
  }, [note.blocks]);

  // Keyboard handling — covers initial show/hide AND dynamic frame changes
  // (iOS QuickType suggestion bar toggling on/off while the user types)
  useEffect(() => {
    const animateTo = (target: number, duration: number) => {
      Animated.timing(keyboardPadding, {
        toValue: target,
        duration: duration || 200,
        useNativeDriver: false,
      }).start();
    };

    const onFrame = (e: { endCoordinates: { height: number; screenY?: number }; duration?: number }) => {
      const screenH = Dimensions.get('window').height;
      // If keyboard is off-screen (hidden), height can be 0 — also check screenY
      const visible = e.endCoordinates.screenY !== undefined
        ? e.endCoordinates.screenY < screenH
        : e.endCoordinates.height > 0;
      // Android with edgeToEdgeEnabled: endCoordinates.height does not include
      // the nav-bar inset, so the toolbar would still be partially clipped.
      const androidNavInset = Platform.OS === 'android' ? bottom : 0;
      setKeyboardVisible(visible);
      animateTo(visible ? e.endCoordinates.height + androidNavInset : 0, e.duration ?? 200);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onFrame);
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardVisible(false);
      animateTo(0, e.duration ?? 200);
    });

    // iOS only: catches suggestion-bar height changes mid-typing
    const frameSub = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillChangeFrame', onFrame)
      : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, [keyboardPadding, bottom]);

  // Persist on every change (debounced via useEffect microtask)
  useEffect(() => {
    if (isNoteEmpty(note)) return;
    if (isNew && !persistedRef.current) {
      addNote(note);
      persistedRef.current = true;
    } else if (!isNew || persistedRef.current) {
      updateNote(note.id, note);
    }
  }, [note]);

  const activeBlock = useMemo(
    () => note.blocks.find((b) => b.id === activeBlockId) ?? null,
    [note.blocks, activeBlockId],
  );

  const updateBlock = useCallback((blockId: string, patch: Partial<NoteBlockData>) => {
    setNote((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  }, []);

  const setActiveBlockType = useCallback((type: NoteBlockType) => {
    if (!activeBlockId) return;
    setNote((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === activeBlockId
          ? {
              ...b,
              type,
              ...(type === 'checklist' && b.checked === undefined ? { checked: false } : {}),
            }
          : b,
      ),
    }));
    // Make sure the input stays focused so the keyboard does not collapse
    requestAnimationFrame(() => {
      blockRefs.current[activeBlockId]?.focus();
    });
  }, [activeBlockId]);

  const splitBlock = useCallback((blockId: string, before: string, after: string) => {
    setNote((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;
      const current = prev.blocks[idx];

      // If list block is empty when Enter is pressed, exit list (new paragraph)
      if (!before.trim() && (current.type === 'bullet' || current.type === 'numbered' || current.type === 'checklist')) {
        const newBlock = createEmptyBlock('paragraph');
        focusBlockIdRef.current = newBlock.id;
        return {
          ...prev,
          blocks: [
            ...prev.blocks.slice(0, idx),
            { ...current, type: 'paragraph' as const, content: '' },
            ...prev.blocks.slice(idx + 1),
          ],
        };
      }

      const newBlock = createEmptyBlock(current.type);
      newBlock.content = after;
      focusBlockIdRef.current = newBlock.id;
      return {
        ...prev,
        blocks: [
          ...prev.blocks.slice(0, idx),
          { ...current, content: before },
          newBlock,
          ...prev.blocks.slice(idx + 1),
        ],
      };
    });
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setNote((prev) => {
      if (prev.blocks.length === 1) return prev;
      const idx = prev.blocks.findIndex((b) => b.id === blockId);
      if (idx <= 0) return prev;
      const previousId = prev.blocks[idx - 1].id;
      focusBlockIdRef.current = previousId;
      return { ...prev, blocks: prev.blocks.filter((b) => b.id !== blockId) };
    });
  }, []);

  const addNewBlockAtEnd = () => {
    const newBlock = createEmptyBlock('paragraph');
    focusBlockIdRef.current = newBlock.id;
    setNote((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('deleteNoteConfirm'),
      t('deleteNoteMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            if (!isNew && persistedRef.current) {
              deleteNote(note.id);
            } else if (!isNew) {
              deleteNote(note.id);
            }
            router.back();
          },
        },
      ],
    );
  };

  // Compute numbered indices for numbered blocks
  const numberedIndices = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;
    let prevType: NoteBlockType | null = null;
    for (const b of note.blocks) {
      if (b.type === 'numbered') {
        if (prevType !== 'numbered') counter = 0;
        counter += 1;
        map[b.id] = counter;
      } else {
        counter = 0;
      }
      prevType = b.type;
    }
    return map;
  }, [note.blocks]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Animated.View style={{ flex: 1, marginBottom: keyboardPadding }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
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
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(231,76,60,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled">
          {/* Title */}
          <TextInput
            value={note.title}
            onChangeText={(title) => setNote((prev) => ({ ...prev, title }))}
            placeholder={t('noteTitlePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: colors.text,
              paddingVertical: 8,
              marginBottom: 8,
            }}
            multiline
            scrollEnabled={false}
          />

          {/* Blocks */}
          <View style={{ gap: 4 }}>
            {note.blocks.map((block, index) => (
              <NoteBlock
                key={block.id}
                ref={(r) => { blockRefs.current[block.id] = r; }}
                block={block}
                numberedIndex={numberedIndices[block.id] ?? 0}
                placeholder={index === 0 && note.blocks.length === 1 ? t('noteContentPlaceholder') : undefined}
                onChange={(content) => updateBlock(block.id, { content })}
                onToggleCheck={() => updateBlock(block.id, { checked: !block.checked })}
                onSplitAt={(before, after) => splitBlock(block.id, before, after)}
                onBackspaceAtStart={() => removeBlock(block.id)}
                onFocus={() => setActiveBlockId(block.id)}
              />
            ))}
          </View>

          {/* Tap zone at the bottom to add a new paragraph */}
          <Pressable
            onPress={addNewBlockAtEnd}
            style={{ minHeight: 200 }}
          />
        </ScrollView>

        {/* Stay mounted while a block is focused — unmounting on keyboard hide
            would cancel taps before onPressIn fires */}
        {activeBlockId && keyboardVisible && (
          <NoteToolbar
            activeType={activeBlock?.type ?? null}
            onSelect={setActiveBlockType}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
