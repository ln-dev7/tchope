import AsyncStorage from '@react-native-async-storage/async-storage';
import { REWARDED_DAILY_LIMIT } from '@/constants/ads';

// Plafond de sécurité quotidien, partagé par TOUS les placements rewarded
// (messages TchopAI, recherche libre, plan de repas) : borne le coût Claude
// par utilisateur. Invisible en usage normal — quand il est atteint, les
// portails ne proposent plus que Tchopé Plus.

const DAY_KEY = 'tchope_rewarded_day';
const COUNT_KEY = 'tchope_rewarded_views';

async function viewsToday(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const day = await AsyncStorage.getItem(DAY_KEY);
  if (day !== today) {
    await AsyncStorage.multiSet([[DAY_KEY, today], [COUNT_KEY, '0']]);
    return 0;
  }
  const raw = await AsyncStorage.getItem(COUNT_KEY);
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function canWatchRewarded(): Promise<boolean> {
  try {
    return (await viewsToday()) < REWARDED_DAILY_LIMIT;
  } catch {
    // En cas de pépin de stockage, on ne bloque jamais la pub (fail-open).
    return true;
  }
}

export async function recordRewardedView(): Promise<void> {
  try {
    const n = await viewsToday();
    await AsyncStorage.setItem(COUNT_KEY, String(n + 1));
  } catch {
    /* non bloquant */
  }
}
