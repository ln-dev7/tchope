import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';
import { requestAiConsent, AiConsentError } from './aiConsentBridge';
import { assertAiAllowed, consumeFreeChat, openPaywallFromServer, ProRequiredError, type AiFeature } from './proBridge';
import { fetchWithDeviceRetry, proHeaders } from '@/lib/pro';
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

/** Erreur de l'API : `update-app` (version trop ancienne) ou `API error: <code>` (repris par le guidage vocal). */
async function postClaude(params: ClaudeRequest, feature: AiFeature): Promise<string> {
  const response = await fetchWithDeviceRetry(() =>
    fetch(`${API_BASE_URL}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...proHeaders() },
      body: JSON.stringify({ ...params, feature }),
    })
  );
  if (response.status === 402) {
    // Le serveur n'a pas reconnu d'abonnement (ou l'avant-goût est épuisé de son côté) : écran Tchopé Pro.
    openPaywallFromServer(feature);
    throw new ProRequiredError();
  }
  if (response.status === 403) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error === 'update-app' ? 'update-app' : `API error: 403`);
  }
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  consumeFreeChat(feature);
  return data.content?.[0]?.text ?? '';
}

/**
 * Appel IA sans cache. `feature` dit quelle fonction appelle (Tchopé Pro, utils/proBridge.ts) : tout est réservé aux
 * abonnés sauf `chat` (3 messages gratuits au total). Sans abonnement, l'écran Pro s'ouvre et ProRequiredError est levée.
 */
export async function callClaudeLive(params: ClaudeRequest, feature: AiFeature): Promise<string> {
  // Consentement obligatoire avant tout envoi vers Anthropic (Apple 5.1.1/5.1.2).
  if (!(await requestAiConsent())) throw new AiConsentError();
  assertAiAllowed(feature);
  return postClaude(params, feature);
}

export async function fetchRecipeUrl(url: string): Promise<string | null> {
  try {
    const response = await fetchWithDeviceRetry(() =>
      fetch(`${API_BASE_URL}/api/fetch-recipe-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...proHeaders() },
        body: JSON.stringify({ url }),
      })
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.content ?? null;
  } catch {
    return null;
  }
}

/** Appel IA avec cache local de 24 h (mêmes règles Tchopé Pro que callClaudeLive, vérifiées AVANT le cache). */
export async function callClaude(params: ClaudeRequest, feature: AiFeature): Promise<string> {
  // Consentement obligatoire avant tout envoi vers Anthropic (Apple 5.1.1/5.1.2).
  if (!(await requestAiConsent())) throw new AiConsentError();
  assertAiAllowed(feature);

  const key = await hashKey(params);

  const cached = await getCache(key);
  if (cached) return cached;

  const text = await postClaude(params, feature);
  await setCache(key, text);
  return text;
}
