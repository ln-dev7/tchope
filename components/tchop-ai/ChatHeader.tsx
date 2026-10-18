import React from 'react';
import type { TranslationKey } from '@/constants/translations';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  colors: any;
  isDark: boolean;
  messageCount: number;
  onBack: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  t: (k: TranslationKey) => string;
};

export default function ChatHeader({ colors, isDark, messageCount, onBack, onNewChat, onOpenHistory, t }: Props) {
  return (
    <View style={{
      paddingBottom: 12,
      paddingHorizontal: 16, paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel={t('back')} onPress={onBack}
        style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
          {t('tchopaiTitle')}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {t('tchopaiSubtitle')}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel={t('tchopaiNewChat')} onPress={onNewChat}
        disabled={messageCount <= 1}
        style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
          opacity: messageCount <= 1 ? 0.4 : 1,
        }}>
        <Ionicons name="create-outline" size={18} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel={t('tchopaiHistory')} onPress={onOpenHistory}
        style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <Ionicons name="time-outline" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
