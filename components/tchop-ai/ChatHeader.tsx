import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  colors: any;
  isDark: boolean;
  messageCount: number;
  onBack: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  t: (k: any) => string;
};

export default function ChatHeader({ colors, isDark, messageCount, onBack, onNewChat, onOpenHistory, t }: Props) {
  return (
    <View style={{
      paddingBottom: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name="sparkles" size={18} color="#A855F7" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
          {t('tchopaiTitle')}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {t('tchopaiSubtitle')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onNewChat}
        disabled={messageCount <= 1}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
          opacity: messageCount <= 1 ? 0.4 : 1,
        }}>
        <Ionicons name="create-outline" size={18} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onOpenHistory}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <Ionicons name="time-outline" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}
