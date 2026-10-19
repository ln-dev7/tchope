import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type ModalProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  center?: boolean;
  scroll?: boolean;
  fill?: boolean;
  padding?: number;
  maxWidth?: number;
  dismissOnBackdrop?: boolean;
  animationType?: ModalProps["animationType"];
  contentStyle?: StyleProp<ViewStyle>;
};

/** A modal has its own safe area: never inherit a tab rail or the previous posture. */
export function AdaptiveModal({ visible, onClose, children, center = false, scroll = true, fill = false, padding = 20, maxWidth = 640, dismissOnBackdrop = true, animationType = "fade", contentStyle }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissOnBackdrop ? onClose : undefined} accessible={false} />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} pointerEvents="box-none">
            <SafeAreaView style={{ flex: 1, padding: 12, justifyContent: center ? "center" : "flex-end", alignItems: "center" }} pointerEvents="box-none">
              <View accessibilityViewIsModal style={{ width: "100%", maxWidth, height: fill ? "85%" : undefined, maxHeight: "100%", borderRadius: 24, overflow: "hidden", backgroundColor: colors.background }}>
                {scroll ? (
                  <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={[{ padding }, contentStyle]} keyboardShouldPersistTaps="handled" bounces={false}>
                    {children}
                  </ScrollView>
                ) : (
                  <View style={[{ padding, flex: fill ? 1 : undefined, flexShrink: 1, minHeight: 0 }, contentStyle]}>{children}</View>
                )}
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
