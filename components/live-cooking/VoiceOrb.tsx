import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { LiveState } from "@/lib/live/session";
import type { ThemeColors } from "@/constants/design";

export default function VoiceOrb({
  state,
  volume,
  colors,
}: {
  state: LiveState;
  volume: number;
  isDark: boolean;
  colors: ThemeColors;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value =
      !reduced && (state === "thinking" || state === "speaking")
        ? withRepeat(
            withSequence(
              withTiming(0.8, { duration: 850 }),
              withTiming(0.25, { duration: 850 }),
            ),
            -1,
          )
        : 0.35;
    return () => cancelAnimation(pulse);
  }, [state, reduced, pulse]);
  useEffect(() => {
    scale.value = withTiming(
      !reduced && state === "listening"
        ? 1 + Math.min(1, Math.max(0, volume)) * 0.12
        : 1,
      { duration: 100 },
    );
    return () => cancelAnimation(scale);
  }, [state, volume, reduced, scale]);
  const ring = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: scale.value }],
  }));
  const active = state === "listening" || state === "speaking";
  return (
    <View
      accessible={false}
      style={{
        width: 180,
        height: 180,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 166,
            height: 166,
            borderRadius: 83,
            backgroundColor: colors.accentSoft,
            borderWidth: 1,
            borderColor: colors.accent,
          },
          ring,
        ]}
      />
      <View
        style={{
          width: 132,
          height: 132,
          borderRadius: 66,
          backgroundColor: active ? colors.accent : colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={
            state === "speaking"
              ? "volume-high-outline"
              : state === "thinking"
                ? "sparkles-outline"
                : "mic-outline"
          }
          size={42}
          color={active ? colors.onAccent : colors.accent}
        />
      </View>
    </View>
  );
}
