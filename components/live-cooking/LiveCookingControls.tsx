import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { LiveState } from "@/hooks/useLiveCooking";

type Props = {
  state: LiveState;
  isDark: boolean;
  onMicPress: () => void;
  onMicRelease: () => void;
  onPhoto: () => void;
  onEnd: () => void;
  colors: {
    onAccent: string;
    card: string;
    accent: string;
    accentLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    surface: string;
    border: string;
  };
  holdLabel: string;
  endLabel: string;
  photoLabel: string;
  mode?: "audio" | "camera";
  disabled?: boolean;
  photoDisabled?: boolean;
};

export default function LiveCookingControls({
  state,
  isDark,
  onMicPress,
  onMicRelease,
  onPhoto,
  onEnd,
  colors,
  holdLabel,
  mode = "audio",
  disabled = false,
  photoDisabled: noPhoto = false,
  endLabel,
  photoLabel,
}: Props) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const micDisabled = disabled || isThinking;
  const photoDisabled = disabled || noPhoto || isThinking || isListening;

  return (
    <View style={styles.container}>
      {/* Camera button — only in audio mode */}
      {mode === "audio" ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={photoLabel}
          onPress={onPhoto}
          disabled={photoDisabled}
          style={[
            styles.sideButton,
            {
              backgroundColor: colors.card,
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.border,
              opacity: photoDisabled ? 0.4 : 1,
            },
          ]}
        >
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideButton} />
      )}

      {/* Main mic button */}
      <View style={styles.micContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={holdLabel}
          accessibilityState={{ disabled: micDisabled, selected: isListening }}
          onPressIn={onMicPress}
          onPressOut={onMicRelease}
          disabled={micDisabled}
          activeOpacity={0.7}
          style={[
            styles.micButton,
            {
              backgroundColor: isListening ? colors.accentLight : colors.accent,
              opacity: micDisabled ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons
            name={isListening ? "mic" : "mic-outline"}
            size={32}
            color={colors.onAccent}
          />
        </TouchableOpacity>
        <Text style={[styles.micHint, { color: colors.textMuted }]}>
          {isListening ? "" : holdLabel}
        </Text>
      </View>

      {/* End session button */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={endLabel}
        onPress={onEnd}
        style={[
          styles.sideButton,
          {
            backgroundColor: colors.card,
            borderWidth: isDark ? 0 : 1,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 16,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  micContainer: {
    alignItems: "center",
    gap: 8,
    flex: 1,
    maxWidth: 180,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  micHint: {
    fontSize: 12,
    minHeight: 16,
    textAlign: "center",
  },
});
