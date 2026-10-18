import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function TchopAIButton() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  const routesToExclude = ['/onboarding', '/tchop-ai', '/live-cooking', '/cooking-mode'];

  if (routesToExclude.includes(pathname)) return null;

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/tchop-ai' as any);
      }}
      activeOpacity={0.85}
      style={{
        position: 'absolute',
        bottom: 90 + bottom,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}>
      <Ionicons name="chatbubble-ellipses" size={26} color={colors.onAccent} />
    </TouchableOpacity>
  );
}
