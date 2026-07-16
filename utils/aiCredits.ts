import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_WELCOME_CREDITS } from '@/constants/ads';

// Crédit de messages TchopAI (modèle « 1 pub = N messages », aligné sur
// Travora). Solde persistant : les messages non consommés restent disponibles
// d'une session à l'autre. Une photo analysée consomme aussi 1 crédit.

const KEY = 'tchope_ai_credits';
const WELCOME_KEY = 'tchope_ai_welcome_granted';

// Clés de l'ancien modèle « 3 messages gratuits/jour + 3 pubs/jour » —
// purgées au premier chargement du nouveau système.
const LEGACY_KEYS = ['tchope_free_messages', 'tchope_free_messages_date', 'tchope_rewarded_count'];

export async function loadAiCredits(): Promise<number> {
  try {
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
    const raw = await AsyncStorage.getItem(KEY);
    let n = parseInt(raw ?? '0', 10);
    n = Number.isFinite(n) && n > 0 ? n : 0;
    // Crédit de bienvenue : la découverte de TchopAI ne passe pas par une pub.
    const welcomed = await AsyncStorage.getItem(WELCOME_KEY);
    if (!welcomed) {
      n += AI_WELCOME_CREDITS;
      await AsyncStorage.setItem(WELCOME_KEY, '1');
      saveAiCredits(n);
    }
    return n;
  } catch {
    return 0;
  }
}

export function saveAiCredits(n: number): void {
  AsyncStorage.setItem(KEY, String(Math.max(0, n))).catch(() => {});
}
