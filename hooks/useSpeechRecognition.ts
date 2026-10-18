import { useState, useCallback, useRef, useEffect } from "react";
import { SpeechTranscript } from "@/lib/live/session";

type SpeechModuleType =
  typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;
let SpeechModule: SpeechModuleType | null = null;
// Dynamic loading keeps the app usable in Expo Go, which lacks the native recognizer.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SpeechModule = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  /* Expo Go */
}
export function isSpeechRecognitionAvailable() {
  try {
    return SpeechModule?.isRecognitionAvailable() ?? false;
  } catch {
    return false;
  }
}

export function useSpeechRecognition(lang: "fr-FR" | "en-US") {
  const [state, setState] = useState<"inactive" | "listening" | "error">(
    "inactive",
  );
  const [transcript, setTranscript] = useState("");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const buffer = useRef(new SpeechTranscript());
  const active = useRef(false);
  const ended = useRef(true);
  const finish = useRef<((value: string) => void) | null>(null);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((value: string) => {
    if (waitTimer.current) clearTimeout(waitTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    waitTimer.current = null;
    maxTimer.current = null;
    finish.current?.(value);
    finish.current = null;
  }, []);

  const abortListening = useCallback(() => {
    active.current = false;
    ended.current = true;
    settle("");
    buffer.current.reset();
    SpeechModule?.abort();
    setState("inactive");
    setVolume(0);
  }, [settle]);

  useEffect(() => {
    if (!SpeechModule) return;
    const on: SpeechModuleType["addListener"] =
      SpeechModule.addListener.bind(SpeechModule);
    const subs = [
      on("start", () => {
        if (active.current) setState("listening");
      }),
      on("result", (event) => {
        if (!active.current) return;
        buffer.current.result(
          event.results[0]?.transcript ?? "",
          event.isFinal,
        );
        setTranscript(buffer.current.value());
      }),
      on("end", () => {
        if (!active.current) return;
        ended.current = true;
        setState("inactive");
        setVolume(0);
        settle(buffer.current.value());
      }),
      on("error", (event) => {
        if (!active.current) return;
        ended.current = true;
        active.current = false;
        buffer.current.reset();
        setState("error");
        setVolume(0);
        setError(event.error);
        settle("");
      }),
      on("volumechange", (event) => {
        if (active.current)
          setVolume(Math.max(0, Math.min(1, (event.value + 2) / 12)));
      }),
    ];
    return () => {
      active.current = false;
      settle("");
      SpeechModule?.abort();
      subs.forEach((s) => s.remove());
    };
  }, [settle]);

  const startListening = useCallback(() => {
    if (!SpeechModule || (active.current && !ended.current)) return false;
    buffer.current.reset();
    setTranscript("");
    setError(null);
    setVolume(0);
    active.current = true;
    ended.current = false;
    try {
      SpeechModule.start({
        lang,
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        contextualStrings: [
          "Tchopé",
          "ndolé",
          "eru",
          "koki",
          "achu",
          "étape suivante",
          "next step",
          "répète",
          "cuisson",
          "arachides",
        ],
      });
      // Holding a button forever must never keep the microphone recording forever.
      maxTimer.current = setTimeout(() => {
        SpeechModule?.abort();
        active.current = false;
        ended.current = true;
        buffer.current.reset();
        settle("");
        setState("error");
        setError("recording-timeout");
        setVolume(0);
      }, 60_000);
      setState("listening");
      return true;
    } catch {
      active.current = false;
      ended.current = true;
      setState("error");
      setError("not-available");
      return false;
    }
  }, [lang, settle]);

  const stopListening = useCallback((): Promise<string> => {
    if (!active.current) return Promise.resolve("");
    if (ended.current) {
      active.current = false;
      return Promise.resolve(buffer.current.value());
    }
    // stop() delivers the final result asynchronously. Read only after native 'end'.
    return new Promise((resolve) => {
      finish.current = (value) => {
        active.current = false;
        resolve(value);
      };
      waitTimer.current = setTimeout(() => {
        const text = buffer.current.value();
        active.current = false;
        ended.current = true;
        SpeechModule?.abort();
        setState("inactive");
        setVolume(0);
        settle(text);
      }, 2500);
      try {
        SpeechModule?.stop();
      } catch {
        settle("");
        active.current = false;
        setState("error");
        setError("not-available");
      }
    });
  }, [settle]);

  const checkPermissions = useCallback(async () => {
    try {
      return SpeechModule
        ? await SpeechModule.getPermissionsAsync()
        : { granted: false, canAskAgain: false };
    } catch {
      return { granted: false, canAskAgain: true };
    }
  }, []);
  const requestPermissions = useCallback(async () => {
    try {
      return SpeechModule
        ? await SpeechModule.requestPermissionsAsync()
        : { granted: false, canAskAgain: false };
    } catch {
      return { granted: false, canAskAgain: false };
    }
  }, []);
  return {
    state,
    transcript,
    volume,
    error,
    startListening,
    stopListening,
    abortListening,
    requestPermissions,
    checkPermissions,
  };
}
