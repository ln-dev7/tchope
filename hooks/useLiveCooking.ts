import { useState, useCallback, useRef, useEffect } from "react";
import { AppState } from "react-native";
import * as Speech from "expo-speech";
import * as ImagePicker from "expo-image-picker";
import { callClaudeLive, fetchLiveUsage, type LiveUsage } from "@/utils/api";
import { aiErrorMessage } from "@/utils/ai-errors";
import { prepareAiImage } from "@/utils/ai-image";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { LiveSession, type LiveImage } from "@/lib/live/session";
import { buildSystemPrompt } from "@/lib/live/prompt";
import type { Recipe } from "@/types";
export type { LiveState } from "@/lib/live/session";

function speak(text: string, language: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      void Speech.stop();
      finish();
    };
    // An OS voice callback can fail to arrive. The UI must still recover.
    const timer = setTimeout(
      abort,
      Math.min(90_000, Math.max(15_000, text.length * 110)),
    );
    signal.addEventListener("abort", abort);
    try {
      Speech.speak(text, {
        language,
        rate: 0.95,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    } catch {
      finish();
    }
  });
}

export function useLiveCooking(
  recipe: Recipe,
  initialStep: number,
  language: "fr" | "en",
) {
  const [, render] = useState(0);
  const [usage, setUsage] = useState<LiveUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState("");
  const mounted = useRef(true);
  const generation = useRef(0);
  const isConnected = useNetworkStatus();
  const speech = useSpeechRecognition(language === "fr" ? "fr-FR" : "en-US");
  const {
    abortListening,
    startListening: startSpeech,
    stopListening: stopSpeech,
  } = speech;
  const current = useRef({ recipe, language });
  current.current = { recipe, language };
  const sessionRef = useRef<LiveSession | null>(null);
  if (!sessionRef.current)
    sessionRef.current = new LiveSession({
      steps: recipe.steps,
      initialStep,
      change: () => {
        if (mounted.current) render((n) => n + 1);
      },
      errorText: (error) =>
        aiErrorMessage(error, current.current.language === "fr"),
      speak: (text, signal) =>
        speak(
          text,
          current.current.language === "fr" ? "fr-FR" : "en-US",
          signal,
        ),
      ask: (messages, step, signal) =>
        callClaudeLive(
          {
            model: "claude-haiku-4-5-20251001",
            max_tokens: 256,
            system: [
              {
                type: "text",
                text: buildSystemPrompt(
                  current.current.recipe,
                  step,
                  current.current.language,
                ),
                cache_control: { type: "ephemeral" },
              },
            ],
            messages,
          },
          "live-cooking",
          {
            signal,
            onUsage: (value) => {
              if (mounted.current) setUsage(value);
            },
          },
        ),
    });
  const session = sessionRef.current;

  const quotaController = useRef<AbortController | null>(null);
  const refreshUsage = useCallback(async () => {
    quotaController.current?.abort();
    const ctrl = new AbortController();
    quotaController.current = ctrl;
    setUsageLoading(true);
    setUsageError("");
    try {
      const value = await fetchLiveUsage(ctrl.signal);
      if (!ctrl.signal.aborted && mounted.current) setUsage(value);
    } catch (e) {
      if (!ctrl.signal.aborted && mounted.current)
        setUsageError(aiErrorMessage(e, language === "fr"));
    } finally {
      if (!ctrl.signal.aborted && mounted.current) setUsageLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!usage) return;
    const timer = setTimeout(
      () => void refreshUsage(),
      Math.max(1000, Date.parse(usage.resetsAt) - Date.now() + 100),
    );
    return () => clearTimeout(timer);
  }, [usage, refreshUsage]);

  const endSession = useCallback(() => {
    generation.current++;
    session.cancel();
    abortListening();
    void Speech.stop();
  }, [session, abortListening]);

  useEffect(() => {
    mounted.current = true;
    void refreshUsage();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        endSession();
      } else void refreshUsage();
    });
    return () => {
      mounted.current = false;
      quotaController.current?.abort();
      endSession();
      sub.remove();
    };
  }, [refreshUsage, endSession]);

  useEffect(() => {
    if (speech.error) {
      session.cancel();
      const fr = language === "fr";
      session.notice(
        speech.error === "no-speech"
          ? fr
            ? "Je n’ai pas entendu de question. Maintenez le micro et réessayez."
            : "I did not hear a question. Hold the microphone and try again."
          : fr
            ? "Le micro ou la reconnaissance vocale s’est interrompu. Vérifiez les autorisations et réessayez."
            : "Microphone or speech recognition was interrupted. Check permissions and try again.",
      );
    }
  }, [speech.error, session, language]);

  const micStart = useRef<Promise<boolean> | null>(null);
  const startListening = useCallback(() => {
    if (!isConnected || usageLoading) return false;
    if (!session.listen()) return false;
    const gen = ++generation.current;
    micStart.current = (async () => {
      try {
        await Speech.stop();
      } catch {
        /* No active voice. */
      }
      if (!mounted.current || gen !== generation.current) return false;
      const started = startSpeech();
      if (!started) session.cancel();
      return started;
    })();
    return true;
  }, [isConnected, usageLoading, session, startSpeech]);

  const submitTranscript = useCallback(
    async (text: string, image?: LiveImage) => {
      if (!mounted.current) return false;
      if (!text.trim()) {
        session.cancel(
          language === "fr"
            ? "Aucune parole détectée. Maintenez le micro pour parler."
            : "No speech detected. Hold the microphone to speak.",
        );
        return false;
      }
      return session.submit(text, image);
    },
    [session, language],
  );

  const stopListening = useCallback(async () => {
    const gen = generation.current;
    session.preparing();
    await micStart.current;
    if (!mounted.current || gen !== generation.current) return "";
    const text = await stopSpeech();
    return gen === generation.current && mounted.current ? text : "";
  }, [stopSpeech, session]);

  const takePhoto = useCallback(
    async (source: "camera" | "gallery" = "camera") => {
      if (
        !isConnected ||
        session.snapshot.state === "thinking" ||
        session.snapshot.state === "listening"
      )
        return false;
      endSession();
      // Native image picker backgrounds the app. Start a fresh turn only after it returns.
      try {
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            session.notice(
              language === "fr"
                ? "Autorisez la caméra dans les réglages du téléphone."
                : "Allow camera access in your phone settings.",
            );
            return false;
          }
        }
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                quality: 0.8,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.8,
              });
        if (result.canceled || !result.assets[0] || !mounted.current)
          return false;
        const gen = generation.current;
        const asset = result.assets[0];
        const image = await prepareAiImage(
          asset.uri,
          asset.width,
          asset.height,
        );
        if (!mounted.current || gen !== generation.current) return false;
        return await session.submit(
          language === "fr"
            ? "Que peux-tu observer sur cette photo de ma préparation ?"
            : "What can you observe in this photo of my preparation?",
          image,
        );
      } catch (e) {
        if (mounted.current)
          session.notice(aiErrorMessage(e, language === "fr"));
        return false;
      }
    },
    [isConnected, session, endSession, language],
  );

  return {
    liveState: session.snapshot.state,
    currentStep: session.snapshot.step,
    totalSteps: recipe.steps.length,
    subtitle: session.snapshot.subtitle,
    hasError: session.snapshot.error,
    userTranscript: speech.transcript,
    volume: speech.volume,
    isConnected,
    startListening,
    stopListening,
    submitTranscript,
    takePhoto,
    endSession,
    goToStep: (step: number) => {
      endSession();
      session.goToStep(step);
    },
    getHistory: () => session.history,
    requestPermissions: speech.requestPermissions,
    checkPermissions: speech.checkPermissions,
    usage,
    usageLoading,
    usageError,
    refreshUsage,
  };
}
