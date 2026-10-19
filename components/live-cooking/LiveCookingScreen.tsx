import { AdaptiveModal } from '@/components/AdaptiveModal';
import { useResponsive } from '@/hooks/useResponsive';
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Linking,
  TouchableOpacity,
  ScrollView,
  AppState,
  ActivityIndicator,
} from "react-native";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettings } from "@/context/SettingsContext";
import { useLiveCooking } from "@/hooks/useLiveCooking";
import { isSpeechRecognitionAvailable } from "@/hooks/useSpeechRecognition";
import { useImageQuota } from "@/hooks/useImageQuota";
import { prepareAiImage } from "@/utils/ai-image";
import { stepCommand, type LiveImage } from "@/lib/live/session";
import { type as typography } from "@/constants/design";
import type { Recipe } from "@/types";
import VoiceOrb from "./VoiceOrb";
import LiveCookingHeader from "./LiveCookingHeader";
import LiveSubtitles from "./LiveSubtitles";
import LiveCookingControls from "./LiveCookingControls";
import CameraPreview from "./CameraPreview";
import AiLoading from "@/components/tchop-ai/AiLoading";

export default function LiveCookingScreen({
  recipe,
  initialStep = 0,
  onClose,
}: {
  recipe: Recipe;
  initialStep?: number;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const fr = settings.language === "fr";
  const { top, bottom } = useSafeAreaInsets();
  const { readable } = useResponsive();
  const live = useLiveCooking(recipe, initialStep, settings.language);
  const imageQuota = useImageQuota();
  const [permission, setPermission] = useState<
    "checking" | "granted" | "ask" | "settings"
  >("checking");
  const [showHistory, setShowHistory] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [picking, setPicking] = useState(false);
  const [mode, setMode] = useState<"audio" | "camera">("audio");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const captureToken = useRef(0);
  const holding = useRef(false);
  const alive = useRef(true);
  const busy = live.liveState === "thinking" || picking;
  const photosAllowed =
    imageQuota.canSend && (live.usage?.photosRemaining ?? 0) > 0;

  const { checkPermissions } = live;
  const check = useCallback(async () => {
    const result = await checkPermissions();
    if (alive.current)
      setPermission(
        result.granted ? "granted" : result.canAskAgain ? "ask" : "settings",
      );
  }, [checkPermissions]);
  useEffect(() => {
    alive.current = true;
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        captureToken.current++;
        holding.current = false;
        setMode("audio");
        setCameraReady(false);
      } else void check();
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [check]);

  const cancelTurn = () => {
    captureToken.current++;
    holding.current = false;
    live.endSession();
  };
  const changeStep = (step: number) => {
    captureToken.current++;
    holding.current = false;
    live.goToStep(step);
  };
  const end = () => {
    cancelTurn();
    onClose();
  };
  const allow = async () => {
    setPermission("checking");
    const result = await live.requestPermissions();
    if (alive.current)
      setPermission(
        result.granted ? "granted" : result.canAskAgain ? "ask" : "settings",
      );
  };
  const switchCamera = async () => {
    if (busy || live.liveState === "listening") return;
    if (mode === "camera") {
      setMode("audio");
      setCameraReady(false);
      return;
    }
    if (!photosAllowed) {
      setCameraMessage(
        fr
          ? "Le solde photo est épuisé. Le mode audio reste disponible."
          : "Your photo balance is used up. Audio mode remains available.",
      );
      return;
    }
    const result = cameraPermission?.granted
      ? cameraPermission
      : await requestCamera();
    if (!alive.current) return;
    if (!result.granted) {
      setCameraMessage(
        fr
          ? "Autorisez la caméra dans les réglages du téléphone."
          : "Allow camera access in your phone settings.",
      );
      return;
    }
    setCameraMessage("");
    setCameraReady(false);
    setMode("camera");
  };
  const micPress = () => {
    if (busy || !live.isConnected || !live.usage || live.usage.remaining <= 0)
      return;
    captureToken.current++;
    holding.current = live.startListening();
    if (holding.current)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const micRelease = async () => {
    if (!holding.current) return;
    holding.current = false;
    const token = captureToken.current;
    const text = await live.stopListening();
    if (!alive.current || token !== captureToken.current) return;
    let image: LiveImage | undefined;
    if (
      text &&
      stepCommand(text, live.currentStep, recipe.steps.length) === null &&
      mode === "camera" &&
      cameraReady &&
      photosAllowed &&
      cameraRef.current
    ) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          imageType: "jpg",
        });
        if (photo)
          image = await prepareAiImage(photo.uri, photo.width, photo.height);
      } catch {
        if (alive.current)
          setCameraMessage(
            fr
              ? "Photo indisponible : votre question sera envoyée sans image."
              : "Photo unavailable: your question will be sent without an image.",
          );
      }
    }
    if (!alive.current || token !== captureToken.current) return;
    const sent = await live.submitTranscript(text, image);
    if (sent && image) await imageQuota.increment();
  };
  const photo = async (source: "camera" | "gallery") => {
    if (picking || busy || !photosAllowed) return;
    setShowSource(false);
    setPicking(true);
    try {
      if (await live.takePhoto(source)) await imageQuota.increment();
    } finally {
      if (alive.current) setPicking(false);
    }
  };

  const button = {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.accent,
  };
  if (!isSpeechRecognitionAvailable() || permission !== "granted")
    return (
      <View
        style={{
          flex: 1,
          paddingTop: top,
          paddingBottom: bottom,
          backgroundColor: colors.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 28,
            gap: 20,
            alignItems: "center",
          }}
        >
          <Ionicons name="mic-outline" size={48} color={colors.accent} />
          <Text
            style={[
              typography.display,
              { color: colors.text, textAlign: "center", fontSize: 30 },
            ]}
          >
            {fr ? "Votre voix, en cuisine." : "Your voice, in the kitchen."}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 23,
            }}
          >
            {!isSpeechRecognitionAvailable()
              ? fr
                ? "La reconnaissance vocale n’est pas disponible dans cette version. Utilisez l’app Tchopé sur un téléphone compatible."
                : "Speech recognition is unavailable in this version. Use Tchopé on a compatible phone."
              : fr
                ? "Autorisez le micro et la reconnaissance vocale. L’écoute démarre uniquement quand vous maintenez le bouton. La caméra reste facultative."
                : "Allow microphone and speech recognition. Listening starts only while you hold the button. Camera access is optional."}
          </Text>
          {permission === "checking" ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            isSpeechRecognitionAvailable() && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={
                  permission === "settings"
                    ? () => void Linking.openSettings()
                    : allow
                }
                style={button}
              >
                <Text style={{ color: colors.onAccent, fontWeight: "700" }}>
                  {permission === "settings"
                    ? fr
                      ? "Ouvrir les réglages"
                      : "Open Settings"
                    : fr
                      ? "Autoriser le micro"
                      : "Allow microphone"}
                </Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={end}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={{ color: colors.textSecondary }}>{t("back")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );

  const resetDate = live.usage
    ? new Date(live.usage.resetsAt).toLocaleDateString(fr ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";
  return (
    <View
      style={[{ flex: 1, paddingTop: top, backgroundColor: colors.background }, readable]}
    >
      <LiveCookingHeader
        recipeName={recipe.name}
        onBack={end}
        onHistory={() => setShowHistory(true)}
        isDark={isDark}
        colors={colors}
      />
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          alignSelf: "center",
          width: "100%",
          maxWidth: 720,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 20,
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>
              {live.usage
                ? fr
                  ? `${live.usage.remaining} réponses restantes`
                  : `${live.usage.remaining} responses left`
                : fr
                  ? "Votre solde Live"
                  : "Your Live balance"}
            </Text>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>PRO</Text>
          </View>
          {live.usage && (
            <>
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${(live.usage.remaining / live.usage.limit) * 100}%`,
                    height: 4,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {fr
                  ? `${live.usage.photosRemaining} photos · renouvellement le ${resetDate} à 00 h UTC`
                  : `${live.usage.photosRemaining} photos · resets ${resetDate}, 00:00 UTC`}
              </Text>
            </>
          )}
          {live.usageLoading && <ActivityIndicator color={colors.accent} />}
          {!!live.usageError && (
            <TouchableOpacity
              onPress={() => void live.refreshUsage()}
              accessibilityRole="button"
              style={{ minHeight: 44 }}
            >
              <Text style={{ color: colors.danger, fontSize: 13 }}>
                {live.usageError} {fr ? "Réessayer" : "Retry"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {!live.isConnected && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {t("liveCookingOffline")}
          </Text>
        )}
        <View style={{ alignItems: "center", gap: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={switchCamera}
            disabled={busy || live.liveState === "listening"}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              borderRadius: 22,
              paddingHorizontal: 18,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name={mode === "camera" ? "videocam" : "mic-outline"}
              size={18}
              color={colors.accent}
            />
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {mode === "camera"
                ? fr
                  ? "Caméra activée"
                  : "Camera on"
                : fr
                  ? "Voix seule · activer la caméra"
                  : "Voice only · enable camera"}
            </Text>
          </TouchableOpacity>
          {mode === "camera" ? (
            <CameraPreview
              cameraRef={cameraRef}
              facing={facing}
              onFlip={() => {
                setCameraReady(false);
                setFacing((f) => (f === "back" ? "front" : "back"));
              }}
              onReady={() => setCameraReady(true)}
              onError={() => {
                setMode("audio");
                setCameraMessage(
                  fr
                    ? "Caméra indisponible. Vous pouvez continuer en audio."
                    : "Camera unavailable. You can continue in audio.",
                );
              }}
              isThinking={live.liveState === "thinking"}
              disabled={busy || live.liveState === "listening"}
              isDark={isDark}
              colors={colors}
            />
          ) : (
            <VoiceOrb
              state={live.liveState}
              volume={live.volume}
              isDark={isDark}
              colors={colors}
            />
          )}
          {mode === "camera" && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {fr
                ? "Une photo accompagne votre question au relâchement du micro. Aucune vidéo n’est envoyée."
                : "One photo accompanies your question when you release the microphone. No video is sent."}
            </Text>
          )}
          {!!cameraMessage && (
            <Text
              accessibilityRole="alert"
              style={{ color: colors.textSecondary, fontSize: 13 }}
            >
              {cameraMessage}
            </Text>
          )}
          {live.liveState === "thinking" ? (
            <AiLoading
              label={
                fr
                  ? "TchopAI prépare votre réponse"
                  : "TchopAI is preparing your answer"
              }
              isFr={fr}
              colors={colors}
              onCancel={cancelTurn}
            />
          ) : (
            <Text style={{ color: colors.textSecondary }}>
              {live.liveState === "listening"
                ? t("listening")
                : live.liveState === "speaking"
                  ? t("speaking")
                  : fr
                    ? "Une question ? Je vous écoute."
                    : "Have a question? I’m listening."}
            </Text>
          )}
        </View>
        <LiveSubtitles
          subtitle={live.subtitle}
          userTranscript={live.userTranscript}
          state={live.liveState}
          error={live.hasError}
          isDark={isDark}
          colors={colors}
        />
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 20,
            padding: 18,
            gap: 12,
          }}
        >
          <Text
            style={{
              color: colors.accent,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            {fr ? "ÉTAPE" : "STEP"} {live.currentStep + 1} / {live.totalSteps}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>
            {recipe.steps[live.currentStep]}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={fr ? "Étape précédente" : "Previous step"}
              disabled={live.currentStep === 0}
              onPress={() => changeStep(live.currentStep - 1)}
              style={{ padding: 12, opacity: live.currentStep === 0 ? 0.3 : 1 }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                cancelTurn();
                void live.submitTranscript("repeat");
              }}
              style={{ padding: 12 }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                {fr ? "Lire l’étape" : "Read step"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={fr ? "Étape suivante" : "Next step"}
              disabled={live.currentStep === live.totalSteps - 1}
              onPress={() => changeStep(live.currentStep + 1)}
              style={{
                padding: 12,
                opacity: live.currentStep === live.totalSteps - 1 ? 0.3 : 1,
              }}
            >
              <Ionicons name="arrow-forward" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
            {fr
              ? "Lire et parcourir les étapes ne consomme aucune réponse."
              : "Reading and navigating steps does not use any responses."}
          </Text>
        </View>
      </ScrollView>
      <View
        style={{
          paddingTop: 12,
          paddingBottom: bottom + 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <LiveCookingControls
          state={live.liveState}
          isDark={isDark}
          onMicPress={micPress}
          onMicRelease={() => void micRelease()}
          onPhoto={() => setShowSource(true)}
          onEnd={end}
          colors={colors}
          holdLabel={t("holdToSpeak")}
          endLabel={t("endSession")}
          photoLabel={t("takePhotoForAI")}
          mode={mode}
          disabled={
            picking ||
            !live.isConnected ||
            !live.usage ||
            live.usage.remaining === 0
          }
          photoDisabled={!photosAllowed}
        />
      </View>
      <AdaptiveModal visible={showHistory} onClose={() => setShowHistory(false)} fill scroll={false} padding={0}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowHistory(false)}
            style={{ padding: 20 }}
          >
            <Text style={{ color: colors.accent }}>
              {fr ? "Fermer l’historique" : "Close history"}
            </Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {!live.getHistory().length && (
              <Text style={{ color: colors.textSecondary }}>
                {fr
                  ? "Vos échanges apparaîtront ici."
                  : "Your conversation will appear here."}
              </Text>
            )}
            {live.getHistory().map((message, i) => (
              <View
                key={i}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  backgroundColor:
                    message.role === "user"
                      ? colors.accentSoft
                      : colors.surface,
                }}
              >
                <Text style={{ color: colors.text, lineHeight: 22 }}>
                  {String(message.content)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

</AdaptiveModal>
      <AdaptiveModal visible={showSource} onClose={() => setShowSource(false)} padding={16}>

          <View
            style={{
              padding: 20,
              borderRadius: 24,
              backgroundColor: colors.card,
              gap: 12,
            }}
          >
            {(["camera", "gallery"] as const).map((source) => (
              <TouchableOpacity
                key={source}
                accessibilityRole="button"
                onPress={() => void photo(source)}
                style={button}
              >
                <Text style={{ color: colors.onAccent, fontWeight: "700" }}>
                  {source === "camera"
                    ? fr
                      ? "Prendre une photo"
                      : "Take a photo"
                    : fr
                      ? "Choisir une photo"
                      : "Choose a photo"}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowSource(false)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text }}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>

</AdaptiveModal>
    </View>
  );
}
