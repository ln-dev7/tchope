import AsyncStorage from '@react-native-async-storage/async-storage';

/* Pont impératif entre le client API (non-React) et l'UI de consentement IA.
 * AiConsentProvider enregistre un handler qui affiche l'écran de consentement ;
 * callClaude/callClaudeLive appellent requestAiConsent() AVANT tout envoi.
 * Garantit qu'aucune donnée ne part vers Anthropic sans accord explicite
 * (Apple 5.1.1(i)/5.1.2(i)), quel que soit le point d'entrée IA de l'app. */

export class AiConsentError extends Error {
  constructor() {
    super('AI consent not granted');
    this.name = 'AiConsentError';
  }
}

type Handler = () => Promise<boolean>;
let handler: Handler | null = null;

/** Enregistré par AiConsentProvider au montage (null au démontage). */
export function setAiConsentHandler(fn: Handler | null): void {
  handler = fn;
}

/** true si le consentement est déjà donné ou vient d'être accordé via l'UI. */
export async function requestAiConsent(): Promise<boolean> {
  if (handler) return handler();
  // Repli si l'UI n'est pas montée : lecture directe du réglage persisté.
  try {
    const raw = await AsyncStorage.getItem('tchope_settings');
    return raw ? JSON.parse(raw)?.aiConsent === true : false;
  } catch {
    return false;
  }
}
