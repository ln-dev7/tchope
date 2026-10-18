import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "@/constants/design";

/** Honest waiting states, not simulated tool activity or a fake percentage. */
export default function AiLoading({
  label,
  isFr,
  colors,
  onCancel,
}: {
  label: string;
  isFr: boolean;
  colors: ThemeColors;
  onCancel?: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [label]);
  useEffect(() => {
    opacity.value = reduced
      ? 1
      : withRepeat(
          withSequence(
            withTiming(0.35, { duration: 750 }),
            withTiming(1, { duration: 750 }),
          ),
          -1,
        );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const detail =
    seconds >= 25
      ? isFr
        ? "Cela prend un peu plus de temps. Vous pouvez annuler et réessayer."
        : "This is taking a little longer. You can cancel and try again."
      : isFr
        ? "La réponse apparaîtra ici. Cela peut prendre quelques secondes."
        : "The answer will appear here. This may take a few seconds.";
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Animated.View
          style={style}
          accessibilityRole="progressbar"
          accessibilityLabel={label}
        >
          <Ionicons name="sparkles" size={20} color={colors.accent} />
        </Animated.View>
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          {label}
        </Text>
        {onCancel && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isFr ? "Annuler la demande" : "Cancel request"}
            onPress={onCancel}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="stop-circle-outline"
              size={24}
              color={colors.accent}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}
      >
        {detail}
      </Text>
    </View>
  );
}
