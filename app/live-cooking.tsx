import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { requireAi } from "@/utils/proBridge";
import Paywall from "@/components/Paywall";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/hooks/useTheme";
import { useLocalizedRecipes } from "@/hooks/useLocalizedRecipes";
import { useUserRecipes } from "@/hooks/useUserRecipes";
import { requestAiConsent } from "@/utils/aiConsentBridge";
import { clampStep } from "@/lib/live/session";
import LiveCookingScreen from "@/components/live-cooking/LiveCookingScreen";
import LiveIntroScreen from "@/components/live-cooking/LiveIntroScreen";

export default function LiveCookingRoute() {
  return <SafeAreaProvider><LiveCookingContent /></SafeAreaProvider>;
}

function LiveCookingContent() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const fr = settings.language === "fr";
  const recipes = useLocalizedRecipes();
  const { userRecipes } = useUserRecipes();
  // Écran d'introduction (fonctionnement du mode Live) avant la session.
  const [started, setStarted] = React.useState(false);
  React.useEffect(() => {
    setStarted(false);
  }, [id]);
  const recipe =
    recipes.find((r) => r.id === id) ?? userRecipes.find((r) => r.id === id);

  if (!recipe || !recipe.steps.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.text }}>
          {fr
            ? "Aucune étape disponible pour cette recette."
            : "No steps are available for this recipe."}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ padding: 16, minHeight: 48 }}
        >
          <Text style={{ color: colors.accent }}>{fr ? "Retour" : "Back"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!started) {
    // Le provider local suit la taille du modal à chaque changement de posture.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LiveIntroScreen
          onClose={() => router.back()}
          onStart={async () => {
            if (requireAi("live-cooking") && (await requestAiConsent()))
              setStarted(true);
          }}
        />
        <Paywall local />
      </View>
    );
  }

  return (
    <>
      <LiveCookingScreen
        key={recipe.id}
        recipe={recipe}
        initialStep={clampStep(Number(step ?? 0), recipe.steps.length)}
        onClose={() => router.back()}
      />
      <Paywall local />
    </>
  );
}
