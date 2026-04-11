import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  input: string;
  setInput: (text: string) => void;
  loading: boolean;
  canSend: boolean;
  canPhoto: boolean;
  colors: any;
  onSend: () => void;
  onPhoto: () => void;
  t: (k: any) => string;
};

export default function ChatInput({ input, setInput, loading, canSend, canPhoto, colors, onSend, onPhoto, t }: Props) {
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    }}>
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 24,
        paddingLeft: 4,
        paddingRight: 4,
        alignItems: 'flex-end',
      }}>
        <TouchableOpacity
          onPress={onPhoto}
          disabled={loading || !canPhoto}
          style={{
            width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
            opacity: loading || !canPhoto ? 0.4 : 1,
          }}>
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('tchopaiPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.text,
            paddingVertical: 12,
            maxHeight: 100,
          }}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={!input.trim() || loading || !canSend}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: input.trim() && !loading && canSend ? '#A855F7' : 'transparent',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
          <Ionicons
            name="send"
            size={18}
            color={input.trim() && !loading && canSend ? '#FFFFFF' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
