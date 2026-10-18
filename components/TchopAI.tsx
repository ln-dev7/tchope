import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Keyboard, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/hooks/useTranslation';
import { AI_FAB_SIZE } from '@/hooks/useTabLayout';

export default function TchopAIButton({ bottom, right }: { bottom: number; right: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (keyboardVisible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('askAI')}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.navigate('/tchop-ai');
      }}
      style={({ pressed }) => ({
        position: 'absolute',
        bottom,
        right,
        width: AI_FAB_SIZE,
        height: AI_FAB_SIZE,
        borderRadius: AI_FAB_SIZE / 2,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}>
      <Ionicons name="sparkles" size={24} color={colors.onAccent} />
    </Pressable>
  );
}
