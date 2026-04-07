import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import type { LiveState } from '@/hooks/useLiveCooking';

type Props = {
  subtitle: string;
  userTranscript: string;
  state: LiveState;
  isDark: boolean;
  colors: {
    text: string;
    textSecondary: string;
    surface: string;
    card: string;
    accent: string;
    border: string;
  };
};

export default function LiveSubtitles({
  subtitle,
  userTranscript,
  state,
  isDark,
  colors,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  const displayText =
    state === 'listening' && userTranscript
      ? userTranscript
      : subtitle;

  const isUserText = state === 'listening' && !!userTranscript;

  useEffect(() => {
    if (displayText) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 });
    }
  }, [displayText]);

  // Hide subtitles immediately when AI stops speaking
  useEffect(() => {
    if (state === 'idle') {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 });
    }
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!displayText) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isUserText
            ? isDark ? `${colors.accent}20` : `${colors.accent}10`
            : isDark ? colors.surface : colors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isUserText ? `${colors.accent}30` : colors.border,
        },
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: isUserText ? colors.accent : colors.text,
            fontStyle: isUserText ? 'italic' : 'normal',
          },
        ]}
        numberOfLines={3}
      >
        {displayText}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
