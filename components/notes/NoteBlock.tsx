import React, { forwardRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NoteBlock as NoteBlockData } from '@/types';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  block: NoteBlockData;
  numberedIndex: number;
  autoFocus?: boolean;
  onChange: (content: string) => void;
  onToggleCheck: () => void;
  onSplitAt: (before: string, after: string) => void;
  onBackspaceAtStart: () => void;
  onFocus: () => void;
  placeholder?: string;
};

const NoteBlock = forwardRef<TextInput, Props>(function NoteBlock(
  { block, numberedIndex, autoFocus, onChange, onToggleCheck, onSplitAt, onBackspaceAtStart, onFocus, placeholder },
  ref,
) {
  const { colors } = useTheme();
  const isList = block.type === 'bullet' || block.type === 'numbered' || block.type === 'checklist';

  const baseStyle = {
    flex: 1,
    color: colors.text,
    paddingVertical: 4,
    fontSize: 16,
    lineHeight: 24,
  };

  const styleByType = {
    heading1: { fontSize: 24, fontWeight: '800' as const, lineHeight: 32 },
    heading2: { fontSize: 19, fontWeight: '700' as const, lineHeight: 26 },
    paragraph: {},
    bullet: {},
    numbered: {},
    checklist: block.checked
      ? { color: colors.textMuted, textDecorationLine: 'line-through' as const }
      : {},
  };

  const handleChange = (text: string) => {
    if (isList && text.includes('\n')) {
      const idx = text.indexOf('\n');
      const before = text.slice(0, idx);
      const after = text.slice(idx + 1);
      onSplitAt(before, after);
      return;
    }
    onChange(text);
  };

  const renderPrefix = () => {
    if (block.type === 'bullet') {
      return (
        <Text style={{ color: colors.text, fontSize: 18, lineHeight: 24, marginTop: 4, width: 18 }}>
          •
        </Text>
      );
    }
    if (block.type === 'numbered') {
      return (
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginTop: 4, width: 22 }}>
          {numberedIndex}.
        </Text>
      );
    }
    if (block.type === 'checklist') {
      return (
        <TouchableOpacity onPress={onToggleCheck} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginTop: 6, marginRight: 4 }}>
          <Ionicons
            name={block.checked ? 'checkbox' : 'square-outline'}
            size={20}
            color={block.checked ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
      {renderPrefix()}
      <TextInput
        ref={ref}
        value={block.content}
        onChangeText={handleChange}
        onFocus={onFocus}
        autoFocus={autoFocus}
        multiline
        scrollEnabled={false}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Backspace' && block.content === '') {
            onBackspaceAtStart();
          }
        }}
        style={[baseStyle, styleByType[block.type]] as any}
      />
    </View>
  );
});

export default NoteBlock;
