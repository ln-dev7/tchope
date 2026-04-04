import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { LiveState } from '@/hooks/useLiveCooking';

type Props = {
  state: LiveState;
  volume: number;
  isDark: boolean;
  colors: {
    accent: string;
    accentLight: string;
    green: string;
    greenText: string;
    textMuted: string;
    surface: string;
    border: string;
  };
};

const ORB_SIZE = 160;
const RING_SIZE = 200;

export default function VoiceOrb({ state, volume, isDark, colors }: Props) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Idle: subtle breathing
  useEffect(() => {
    if (state === 'idle') {
      cancelAnimation(scale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(rotation);
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      ringOpacity.value = withTiming(0, { duration: 300 });
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [state === 'idle']);

  // Listening: volume-reactive pulse
  useEffect(() => {
    if (state === 'listening') {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 200 });
      ringOpacity.value = withTiming(0.4, { duration: 300 });
    }
  }, [state === 'listening']);

  useEffect(() => {
    if (state === 'listening') {
      const targetScale = 1 + volume * 0.25;
      scale.value = withSpring(targetScale, { damping: 12, stiffness: 200 });
      ringScale.value = withSpring(1 + volume * 0.15, { damping: 15, stiffness: 180 });
    }
  }, [volume, state]);

  // Thinking: rotation + pulse
  useEffect(() => {
    if (state === 'thinking') {
      cancelAnimation(scale);
      scale.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      );
      ringOpacity.value = withTiming(0.6, { duration: 300 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [state === 'thinking']);

  // Speaking: gentle pulse
  useEffect(() => {
    if (state === 'speaking') {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 300 });
      ringOpacity.value = withTiming(0.5, { duration: 300 });
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [state === 'speaking']);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  // Colors aligned with app theme
  const orbColor =
    state === 'speaking'
      ? colors.green
      : state === 'listening'
        ? colors.accent
        : state === 'thinking'
          ? colors.accentLight
          : isDark
            ? '#3A3A3A'
            : colors.surface;

  const ringColor =
    state === 'speaking'
      ? isDark ? 'rgba(76,175,80,0.2)' : 'rgba(10,106,29,0.12)'
      : state === 'listening'
        ? isDark ? `${colors.accent}30` : `${colors.accent}18`
        : state === 'thinking'
          ? isDark ? `${colors.accentLight}25` : `${colors.accentLight}15`
          : 'transparent';

  const iconColor =
    state === 'idle' && !isDark
      ? colors.textMuted
      : '#FFFFFF';

  const iconName: keyof typeof Ionicons.glyphMap =
    state === 'listening'
      ? 'mic'
      : state === 'thinking'
        ? 'hourglass-outline'
        : state === 'speaking'
          ? 'volume-high'
          : 'mic-outline';

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { borderColor: ringColor, backgroundColor: ringColor },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          orbStyle,
          {
            backgroundColor: orbColor,
            shadowOpacity: state === 'idle' && !isDark ? 0.08 : 0.25,
            borderWidth: state === 'idle' && !isDark ? 1 : 0,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name={iconName} size={48} color={iconColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
});
