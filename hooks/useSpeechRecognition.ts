import { useState, useCallback, useRef, useEffect } from 'react';

type SpeechState = 'inactive' | 'listening' | 'error';

// Lazy-load the native module to avoid crashes in Expo Go
let SpeechModule: any = null;
let useEvent: any = null;
let moduleAvailable = false;

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useEvent = mod.useSpeechRecognitionEvent;
  moduleAvailable = true;
} catch {
  moduleAvailable = false;
}

// No-op hook when the module isn't loaded
function useNoopEvent(_name: string, _cb: any) {}

export function isSpeechRecognitionAvailable() {
  return moduleAvailable;
}

export function useSpeechRecognition(lang: 'fr-FR' | 'en-US') {
  const [state, setState] = useState<SpeechState>('inactive');
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  const hookFn = moduleAvailable ? useEvent : useNoopEvent;

  hookFn('start', () => {
    setState('listening');
    setTranscript('');
  });

  hookFn('result', (event: any) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal && text.trim()) {
      onResultRef.current?.(text.trim());
      setTranscript('');
    }
  });

  hookFn('end', () => {
    setState('inactive');
    setVolume(0);
  });

  hookFn('error', (event: any) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      setState('error');
    } else {
      setState('inactive');
    }
    setVolume(0);
  });

  hookFn('volumechange', (event: any) => {
    setVolume(Math.max(0, Math.min(1, (event.value + 2) / 12)));
  });

  const startListening = useCallback(
    (onResult: (text: string) => void) => {
      if (!SpeechModule) return;
      onResultRef.current = onResult;
      setTranscript('');
      SpeechModule.start({
        lang,
        interimResults: true,
        continuous: false,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        contextualStrings: [
          'Tchopé', 'ndolé', 'eru', 'koki', 'achu',
          'étape suivante', 'next step', 'répète',
          'ingrédient', 'cuisson', 'arachides',
        ],
      });
    },
    [lang],
  );

  const stopListening = useCallback(() => {
    SpeechModule?.stop();
  }, []);

  const abortListening = useCallback(() => {
    SpeechModule?.abort();
  }, []);

  const requestPermissions = useCallback(async (): Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }> => {
    if (!SpeechModule) return { granted: false, canAskAgain: false };

    // Request mic first, then speech recognition separately
    const mic = await SpeechModule.requestMicrophonePermissionsAsync();
    if (!mic.granted) {
      return { granted: false, canAskAgain: mic.canAskAgain };
    }

    const speech = await SpeechModule.requestSpeechRecognizerPermissionsAsync();
    if (!speech.granted) {
      return { granted: false, canAskAgain: speech.canAskAgain };
    }

    return { granted: true, canAskAgain: true };
  }, []);

  const checkPermissions = useCallback(async () => {
    if (!SpeechModule) return false;
    const result = await SpeechModule.getPermissionsAsync();
    return result.granted;
  }, []);

  return {
    state,
    transcript,
    volume,
    startListening,
    stopListening,
    abortListening,
    requestPermissions,
    checkPermissions,
    isAvailable: moduleAvailable,
  };
}
