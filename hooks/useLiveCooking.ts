import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';

import { callClaudeLive } from '@/utils/api';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { Recipe } from '@/types';

export type LiveState = 'idle' | 'listening' | 'thinking' | 'speaking';

type Message = {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>;
};

const MAX_HISTORY = 15;

function buildSystemPrompt(
  recipe: Recipe,
  currentStep: number,
  language: 'fr' | 'en',
): string {
  const stepsText = recipe.steps
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
  const ingredientsText = recipe.ingredients
    .map((ing) => `- ${ing.name}: ${ing.quantity}`)
    .join('\n');

  if (language === 'fr') {
    return `Tu es TchopAI Live, l'assistant vocal cuisine de Tchopé. Tu guides l'utilisateur en temps réel pendant la cuisine.

Recette : ${recipe.name}
Étape actuelle : ${currentStep + 1}/${recipe.steps.length} — "${recipe.steps[currentStep]}"
Ingrédients :
${ingredientsText}
Toutes les étapes :
${stepsText}
${recipe.tips ? `Astuces : ${recipe.tips}` : ''}
Portions : ${recipe.servings}

RÈGLES STRICTES :
1. Réponds en français, tutoie l'utilisateur
2. Réponds en 1-2 phrases MAX. L'utilisateur cuisine, il a pas le temps. Sois direct.
3. Ton chaleureux, direct et encourageant, comme un guide cuisine camerounais
4. Si l'utilisateur envoie une photo, analyse-la et donne un feedback précis sur ce que tu vois : cuisson, texture, couleur, quantité, etc.
5. Si l'utilisateur demande un substitut d'ingrédient, propose des alternatives camerounaises
6. Si l'utilisateur signale un problème (trop salé, brûlé, etc.), donne des solutions de rattrapage
7. Rappelle proactivement des choses importantes : "N'oublie pas de remuer régulièrement"
8. Si une question n'a rien à voir avec la cuisine, ramène poliment vers la recette
9. JAMAIS de formatage markdown, de listes à puces ou de numéros — tu PARLES, tu n'écris pas. Tes réponses seront lues à haute voix.
10. Utilise des expressions camerounaises naturellement : "c'est bon comme ça", "tu tchop ça", "c'est prêt hein"
11. INTERDIT d'utiliser des termes genrés ou familiers supposant le genre : "ma chère", "mon cher", "ma fille", "mon fils", "ma belle", "mon grand", "frère", "sœur", "frérot", "boss", "chef", "monsieur", "madame", "mademoiselle", "bro", "king", "queen". Tu ne connais PAS le genre de l'utilisateur. Dis simplement "tu" ou "toi", jamais de surnom genré.`;
  }

  return `You are TchopAI Live, the voice cooking assistant from Tchopé. You guide the user in real-time while they cook.

Recipe: ${recipe.name}
Current step: ${currentStep + 1}/${recipe.steps.length} — "${recipe.steps[currentStep]}"
Ingredients:
${ingredientsText}
All steps:
${stepsText}
${recipe.tips ? `Tips: ${recipe.tips}` : ''}
Servings: ${recipe.servings}

STRICT RULES:
1. Respond in English
2. Respond in 1-2 sentences MAX. The user is cooking, they don't have time. Be direct.
3. Warm, direct and encouraging tone, like a Cameroonian cooking guide
4. If the user sends a photo, analyze it and give precise feedback on what you see: cooking level, texture, color, quantity, etc.
5. If the user asks for an ingredient substitute, suggest Cameroonian alternatives
6. If the user reports a problem (too salty, burnt, etc.), give recovery solutions
7. Proactively remind important things: "Don't forget to stir regularly"
8. If a question has nothing to do with cooking, politely redirect to the recipe
9. NEVER use markdown formatting, bullet points or numbers — you SPEAK, you don't write. Your responses will be read aloud.
10. Use Cameroonian expressions naturally: "that's good like that", "you chop that", "it's ready oh"
11. NEVER use gendered or familiar terms that assume gender: "my dear", "sweetie", "son", "darling", "brother", "sister", "bro", "sis", "boss", "king", "queen", "sir", "ma'am", "miss", "man", "girl". You do NOT know the user's gender. Just use "you" directly, no gendered nicknames.`;
}

export function useLiveCooking(
  recipe: Recipe,
  initialStep: number,
  language: 'fr' | 'en',
) {
  const [liveState, setLiveState] = useState<LiveState>('idle');
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [subtitle, setSubtitle] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const historyRef = useRef<Message[]>([]);
  const isSpeakingRef = useRef(false);
  const isConnected = useNetworkStatus();
  const lang = language === 'fr' ? 'fr-FR' : 'en-US';
  const speech = useSpeechRecognition(lang as 'fr-FR' | 'en-US');

  // Sync user transcript from speech recognition
  useEffect(() => {
    setUserTranscript(speech.transcript);
  }, [speech.transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
      speech.abortListening();
    };
  }, []);

  const speakResponse = useCallback(
    (text: string) => {
      return new Promise<void>((resolve) => {
        isSpeakingRef.current = true;
        setLiveState('speaking');
        setSubtitle(text);
        Speech.speak(text, {
          language: lang,
          rate: 0.95,
          onDone: () => {
            isSpeakingRef.current = false;
            setLiveState('idle');
            resolve();
          },
          onStopped: () => {
            isSpeakingRef.current = false;
            resolve();
          },
          onError: () => {
            isSpeakingRef.current = false;
            setLiveState('idle');
            resolve();
          },
        });
      });
    },
    [lang],
  );

  const interruptSpeaking = useCallback(() => {
    if (isSpeakingRef.current) {
      Speech.stop();
      isSpeakingRef.current = false;
    }
  }, []);

  const detectStepCommand = useCallback(
    (text: string): number | null => {
      const lower = text.toLowerCase();
      // Next step
      if (
        lower.includes('étape suivante') ||
        lower.includes('next step') ||
        lower.includes('prochaine étape') ||
        lower.includes('step suivant')
      ) {
        if (currentStep < recipe.steps.length - 1) {
          return currentStep + 1;
        }
      }
      // Previous step
      if (
        lower.includes('étape précédente') ||
        lower.includes('previous step') ||
        lower.includes('step précédent') ||
        lower.includes('reviens') ||
        lower.includes('go back')
      ) {
        if (currentStep > 0) {
          return currentStep - 1;
        }
      }
      // Repeat step
      if (
        lower.includes('répète') ||
        lower.includes('repeat') ||
        lower.includes('relis') ||
        lower.includes('encore')
      ) {
        return currentStep; // same step triggers re-read
      }
      return null;
    },
    [currentStep, recipe.steps.length],
  );

  // Store latest photo so user can talk about it after taking it
  const pendingPhotoRef = useRef<string | null>(null);

  const sendToAI = useCallback(
    async (userContent: Message['content']) => {
      setLiveState('thinking');
      setUserTranscript('');

      const userMessage: Message = { role: 'user', content: userContent };
      historyRef.current.push(userMessage);

      // Trim history
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY);
      }

      const systemPrompt = buildSystemPrompt(recipe, currentStep, language);

      try {
        const response = await callClaudeLive({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: historyRef.current.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
        };
        historyRef.current.push(assistantMessage);

        await speakResponse(response);
      } catch (error: any) {
        let errorMsg: string;
        const message = error?.message ?? '';

        if (message.includes('Network') || message.includes('fetch')) {
          errorMsg = language === 'fr'
            ? 'Impossible de contacter le serveur. Vérifie ta connexion internet et réessaie.'
            : 'Unable to reach the server. Check your internet connection and try again.';
        } else if (message.includes('429') || message.includes('rate')) {
          errorMsg = language === 'fr'
            ? 'Le serveur est surchargé. Réessaie dans quelques secondes.'
            : 'The server is overloaded. Try again in a few seconds.';
        } else if (message.includes('5') && message.includes('API error')) {
          errorMsg = language === 'fr'
            ? 'Le serveur est temporairement indisponible. Réessaie plus tard.'
            : 'The server is temporarily unavailable. Try again later.';
        } else {
          errorMsg = language === 'fr'
            ? "TchopAI n'a pas pu répondre. Réessaie ta question."
            : "TchopAI couldn't respond. Try asking again.";
        }

        setSubtitle(errorMsg);
        setLiveState('idle');
      }
    },
    [recipe, currentStep, language, speakResponse],
  );

  // Attach pending photo if user speaks right after taking one
  const sendWithOptionalPhoto = useCallback(
    async (userContent: Message['content'], imageBase64?: string) => {
      // If an image is provided directly (e.g. from live camera mode), use it
      if (imageBase64 && typeof userContent === 'string') {
        pendingPhotoRef.current = null;
        await sendToAI([
          { type: 'text', text: userContent },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ]);
        return;
      }

      // Otherwise, check for pending photo from manual capture
      const photo = pendingPhotoRef.current;
      if (photo && typeof userContent === 'string') {
        pendingPhotoRef.current = null;
        await sendToAI([
          { type: 'text', text: userContent },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: photo,
            },
          },
        ]);
      } else {
        pendingPhotoRef.current = null;
        await sendToAI(userContent);
      }
    },
    [sendToAI],
  );

  // Ref to hold an image to attach when speech result arrives (from live camera)
  const liveCameraImageRef = useRef<string | null>(null);

  const handleSpeechResult = useCallback(
    (text: string) => {
      // Check for step navigation commands
      const stepCmd = detectStepCommand(text);
      if (stepCmd !== null) {
        setCurrentStep(stepCmd);
      }

      const liveImage = liveCameraImageRef.current;
      liveCameraImageRef.current = null;
      sendWithOptionalPhoto(text, liveImage ?? undefined);
    },
    [detectStepCommand, sendWithOptionalPhoto],
  );

  const setLiveCameraImage = useCallback((base64: string | null) => {
    liveCameraImageRef.current = base64;
  }, []);

  const startListening = useCallback(() => {
    if (!isConnected) return;
    interruptSpeaking();
    setLiveState('listening');
    speech.startListening(handleSpeechResult);
  }, [isConnected, interruptSpeaking, speech.startListening, handleSpeechResult]);

  const stopListening = useCallback(() => {
    speech.stopListening();
  }, [speech.stopListening]);

  const takePhoto = useCallback(async (source: 'camera' | 'gallery' = 'camera') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          const msg = language === 'fr'
            ? "L'accès à la caméra a été refusé. Active-le dans les réglages pour envoyer des photos."
            : 'Camera access was denied. Enable it in Settings to send photos.';
          setSubtitle(msg);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.5,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          const msg = language === 'fr'
            ? "L'accès à la galerie a été refusé. Active-le dans les réglages pour choisir des photos."
            : 'Gallery access was denied. Enable it in Settings to choose photos.';
          setSubtitle(msg);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.5,
          base64: true,
        });
      }

      if (result.canceled) return;

      if (!result.assets[0]?.base64) {
        const msg = language === 'fr'
          ? 'Impossible de charger la photo. Réessaie avec une autre image.'
          : 'Unable to load the photo. Try again with another image.';
        setSubtitle(msg);
        return;
      }

      interruptSpeaking();

      // Store photo so next voice message includes it
      pendingPhotoRef.current = result.assets[0].base64;

      // Also send immediately with a generic prompt
      const prompt =
        language === 'fr'
          ? 'Regarde cette photo de ma préparation et dis-moi ce que tu en penses.'
          : 'Look at this photo of my preparation and tell me what you think.';

      await sendToAI([
        { type: 'text', text: prompt },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: result.assets[0].base64,
          },
        },
      ]);
    } catch (error: any) {
      const message = error?.message ?? '';
      // Don't show error if user just cancelled the picker
      if (message.includes('cancel') || message.includes('Cancel')) return;

      const msg = language === 'fr'
        ? 'Impossible de charger la photo. Réessaie avec une autre image.'
        : 'Unable to load the photo. Try again with another image.';
      setSubtitle(msg);
    }
  }, [language, interruptSpeaking, sendToAI]);

  const endSession = useCallback(() => {
    Speech.stop();
    speech.abortListening();
    historyRef.current = [];
    setLiveState('idle');
    setSubtitle('');
    setUserTranscript('');
  }, [speech.abortListening]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < recipe.steps.length) {
        setCurrentStep(step);
      }
    },
    [recipe.steps.length],
  );

  return {
    liveState,
    currentStep,
    totalSteps: recipe.steps.length,
    subtitle,
    userTranscript,
    volume: speech.volume,
    isConnected,
    startListening,
    stopListening,
    takePhoto,
    endSession,
    goToStep,
    getHistory: () => historyRef.current,
    requestPermissions: speech.requestPermissions,
    checkPermissions: speech.checkPermissions,
    setLiveCameraImage,
  };
}
