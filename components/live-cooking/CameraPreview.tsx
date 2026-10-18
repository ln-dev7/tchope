import React from "react";
import { View, TouchableOpacity } from "react-native";
import { CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "@/constants/design";
import { useSettings } from "@/context/SettingsContext";

type Props = {
  cameraRef: React.RefObject<CameraView | null>;
  facing: "front" | "back";
  onFlip: () => void;
  onReady: () => void;
  onError: () => void;
  disabled: boolean;
  isThinking: boolean;
  isDark: boolean;
  colors: ThemeColors;
};
export default function CameraPreview({
  cameraRef,
  facing,
  onFlip,
  onReady,
  onError,
  disabled,
  colors,
}: Props) {
  const { settings } = useSettings();
  return (
    <View
      style={{
        width: "100%",
        maxWidth: 400,
        height: 230,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <CameraView
        key={facing}
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        onCameraReady={onReady}
        onMountError={onError}
      />
      <TouchableOpacity
        onPress={onFlip}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          settings.language === "fr" ? "Retourner la caméra" : "Flip camera"
        }
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#0009",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
