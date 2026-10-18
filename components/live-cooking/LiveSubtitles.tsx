import React from "react";
import { Text } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import type { LiveState } from "@/lib/live/session";
import type { ThemeColors } from "@/constants/design";

export default function LiveSubtitles({
  subtitle,
  userTranscript,
  state,
  colors,
  error = false,
}: {
  subtitle: string;
  userTranscript: string;
  state: LiveState;
  isDark: boolean;
  colors: ThemeColors;
  error?: boolean;
}) {
  const reduced = useReducedMotion();
  const listening = state === "listening";
  const text = listening ? userTranscript : subtitle;
  if (!text) return null;
  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(180)}
      style={{
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: error ? colors.danger : colors.border,
        backgroundColor: listening ? colors.accentSoft : colors.card,
      }}
    >
      <Text
        selectable={!listening}
        accessibilityLiveRegion={listening ? "none" : "polite"}
        style={{
          fontSize: 16,
          lineHeight: 25,
          color: error ? colors.danger : colors.text,
        }}
      >
        {text}
      </Text>
    </Animated.View>
  );
}
