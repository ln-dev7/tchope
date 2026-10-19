import { useResponsive } from '@/hooks/useResponsive';
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useSettings } from "@/context/SettingsContext";
import { type as typography } from "@/constants/design";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";

const FEATURES = [
  { icon: "mic-outline", key: "liveExplainFeature1" },
  { icon: "camera-outline", key: "liveExplainFeature2" },
  { icon: "hand-left-outline", key: "liveExplainFeature3" },
] as const;

/** Écran d'introduction TchopAI Live : présente le fonctionnement du mode
 *  (guidage vocal, photo, temps réel) avant de démarrer la session. */
export default function LiveIntroScreen({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const fr = settings.language === "fr";
  const { top, bottom } = useSafeAreaInsets();
  const { readable } = useResponsive();

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart();
  };

  return (
    <ScrollView style={readable}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: top + 8,
        paddingBottom: bottom + 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Close */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={fr ? "Fermer" : "Close"}
          onPress={onClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Icon */}
      <View style={{ alignItems: "center", marginTop: 24 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="mic" size={40} color={colors.accent} />
        </View>
      </View>

      {/* Title + Description */}
      <Text
        style={{
          ...typography.display,
          fontSize: 30,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          letterSpacing: -0.5,
          marginTop: 20,
        }}
      >
        {t("liveExplainTitle")}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 12,
          lineHeight: 22,
          paddingHorizontal: 8,
        }}
      >
        {t("liveExplainDesc")}
      </Text>

      {/* Features */}
      <View style={{ marginTop: 32, gap: 16 }}>
        {FEATURES.map((f) => (
          <View
            key={f.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: isDark ? colors.surface : "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={f.icon as any} size={20} color={colors.accent} />
            </View>
            <Text
              style={{
                fontSize: 15,
                color: colors.text,
                flex: 1,
                fontWeight: "500",
              }}
            >
              {t(f.key as any)}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 24,
          padding: 18,
          borderRadius: 20,
          backgroundColor: colors.accentSoft,
          gap: 8,
        }}
      >
        <Text style={{ color: colors.accent, fontWeight: "700" }}>
          {fr ? "Inclus avec Tchopé Pro" : "Included with Tchopé Pro"}
        </Text>
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          {fr
            ? "100 réponses Live par semaine, dont 20 analyses photo. Renouvellement le lundi à 00 h UTC."
            : "100 Live responses each week, including up to 20 photo analyses. Resets Monday at 00:00 UTC."}
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}
        >
          {fr
            ? "Lire et parcourir les étapes reste gratuit. La caméra envoie uniquement une photo par question, jamais de vidéo."
            : "Reading and navigating steps uses no allowance. The camera sends one photo per question, never video."}
        </Text>
      </View>
      {/* CTA */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t("liveStartCta")}
        onPress={handleStart}
        activeOpacity={0.85}
        style={{
          marginTop: 32,
          backgroundColor: colors.accent,
          borderRadius: 20,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Ionicons name="play" size={18} color={colors.onAccent} />
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: colors.onAccent }}
        >
          {t("liveStartCta")}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
