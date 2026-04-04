import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { LiveState } from '@/hooks/useLiveCooking';

type Props = {
  state: LiveState;
  isDark: boolean;
  onMicPress: () => void;
  onMicRelease: () => void;
  onPhoto: () => void;
  onEnd: () => void;
  colors: {
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
}: Props) {
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const micDisabled = isThinking;

  return (
    <View style={styles.container}>
      {/* Camera button */}
      <TouchableOpacity
        onPress={onPhoto}
        disabled={isThinking}
        style={[
          styles.sideButton,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: colors.border,
            opacity: isThinking ? 0.4 : 1,
          },
        ]}
      >
        <Ionicons name="camera-outline" size={24} color={colors.accent} />
      </TouchableOpacity>

      {/* Main mic button */}
      <View style={styles.micContainer}>
        <TouchableOpacity
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
            name={isListening ? 'mic' : 'mic-outline'}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={[styles.micHint, { color: colors.textMuted }]}>
          {isListening ? '' : holdLabel}
        </Text>
      </View>

      {/* End session button */}
      <TouchableOpacity
        onPress={onEnd}
        style={[
          styles.sideButton,
          {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 24,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micContainer: {
    alignItems: 'center',
    gap: 8,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  micHint: {
    fontSize: 12,
    height: 16,
  },
});
