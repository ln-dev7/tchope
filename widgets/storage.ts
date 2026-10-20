import AsyncStorage from '@react-native-async-storage/async-storage';
/** Read-only: a malformed legacy value must never overwrite the app’s data. */
export async function readStored<T>(key: string, fallback: T): Promise<T> {
 try {
  const raw = await AsyncStorage.getItem(key); if (!raw) return fallback;
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || parsed === undefined) return fallback;
  if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
  if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback) && (typeof parsed !== 'object' || Array.isArray(parsed))) return fallback;
  return parsed as T;
 } catch { return fallback; }
}
