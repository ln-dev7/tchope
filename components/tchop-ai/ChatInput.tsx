import React from "react";
import type { TranslationKey } from "@/constants/translations";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  input: string;
  setInput: (text: string) => void;
  loading: boolean;
  canSend: boolean;
  canPhoto: boolean;
  colors: any;
  onSend: () => void;
  onPhoto: () => void;
  t: (k: TranslationKey) => string;
};

export default function ChatInput({
  input,
  setInput,
  loading,
  canSend,
  canPhoto,
  colors,
  onSend,
  onPhoto,
  t,
}: Props) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          paddingLeft: 4,
          paddingRight: 4,
          alignItems: "flex-end",
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("tchopaiPhoto")}
          onPress={onPhoto}
          disabled={loading || !canPhoto}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
            opacity: loading || !canPhoto ? 0.4 : 1,
          }}
        >
          <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          accessibilityLabel={t("tchopaiPlaceholder")}
          value={input}
          onChangeText={setInput}
          placeholder={t("tchopaiPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.text,
            paddingVertical: 12,
            maxHeight: 100,
          }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("tchopaiSend")}
          onPress={onSend}
          disabled={!input.trim() || loading || !canSend}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor:
              input.trim() && !loading && canSend
                ? colors.accent
                : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <Ionicons
            name="send"
            size={18}
            color={
              input.trim() && !loading && canSend
                ? colors.onAccent
                : colors.textMuted
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
