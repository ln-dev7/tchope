import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  cameraRef: React.RefObject<CameraView | null>;
  facing: 'front' | 'back';
  onFlip: () => void;
  isThinking: boolean;
  isDark: boolean;
  colors: {
    accent: string;
    surface: string;
    border: string;
  };
};

export default function CameraPreview({
  cameraRef,
  facing,
  onFlip,
  isThinking,
  isDark,
  colors,
}: Props) {
  return (
    <View style={[styles.container, { borderColor: isDark ? colors.border : '#E0E0E0' }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />

      {/* Flip camera button */}
      <TouchableOpacity
        onPress={onFlip}
        style={[styles.flipButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Thinking overlay */}
      {isThinking && (
        <View style={styles.thinkingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '80%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  camera: {
    flex: 1,
  },
  flipButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
