import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const CACHE_PREFIX = 'ai_cache:';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

type SystemBlock = {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
};

type MessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    >;

type ClaudeRequest = {
  model: string;
  max_tokens?: number;
  system: string | SystemBlock[];
  messages: { role: string; content: MessageContent }[];
};

type CacheEntry = {
  text: string;
  expiresAt: number;
};

async function hashKey(params: ClaudeRequest): Promise<string> {
  const raw = JSON.stringify({ m: params.model, s: params.system, msg: params.messages });
  // Simple string hash — fast and good enough for cache keys
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return CACHE_PREFIX + h.toString(36);
}

async function getCache(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      AsyncStorage.removeItem(key);
      return null;
    }
    return entry.text;
  } catch {
    return null;
  }
}

async function setCache(key: string, text: string): Promise<void> {
  try {
    const entry: CacheEntry = { text, expiresAt: Date.now() + CACHE_TTL };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function callClaudeLive(params: ClaudeRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

export async function callClaude(params: ClaudeRequest): Promise<string> {
  const key = await hashKey(params);

  const cached = await getCache(key);
  if (cached) return cached;

  const response = await fetch(`${API_BASE_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? '';

  await setCache(key, text);

  return text;
}
