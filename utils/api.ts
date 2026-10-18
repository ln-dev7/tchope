import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";
import { requestAiConsent, AiConsentError } from "./aiConsentBridge";
import {
  assertAiAllowed,
  consumeFreeChat,
  openPaywallFromServer,
  ProRequiredError,
  type AiFeature,
} from "./proBridge";
import { fetchWithDeviceRetry, proHeaders } from "@/lib/pro";
import { liveQuota } from "@/services/liveQuota";
import { LiveQuotaError, type LiveUsage } from "@/lib/live/quota";
export type { LiveUsage } from "@/lib/live/quota";
const CACHE_PREFIX = "ai_cache:";
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

type SystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

type MessageContent =
  | string
  | (
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
    )[];

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
  const raw = JSON.stringify({
    m: params.model,
    s: params.system,
    msg: params.messages,
  });
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

export class AiApiError extends Error {
  code: string;
  status: number;
  usage?: LiveUsage;
  constructor(code: string, status = 0, usage?: LiveUsage) {
    super(code);
    this.name = "AiApiError";
    this.code = code;
    this.status = status;
    this.usage = usage;
  }
}
export type AiRequestOptions = {
  signal?: AbortSignal;
  onUsage?: (usage: LiveUsage) => void;
};

async function readResponse(
  response: Response,
  feature: AiFeature,
  onUsage?: (usage: LiveUsage) => void,
) {
  const data = await response.json().catch(() => null);
  if (data?.liveUsage) onUsage?.(data.liveUsage);
  if (response.status === 402) {
    openPaywallFromServer(feature);
    throw new ProRequiredError();
  }
  if (!response.ok)
    throw new AiApiError(
      data?.error ?? "ai-failed",
      response.status,
      data?.liveUsage,
    );
  return data;
}

async function postClaude(
  params: ClaudeRequest,
  feature: AiFeature,
  options: AiRequestOptions = {},
): Promise<string> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (options.signal?.aborted) ctrl.abort();
  options.signal?.addEventListener("abort", abort);
  const timeout = setTimeout(abort, 50_000);
  let reservation: Awaited<ReturnType<typeof liveQuota.reserve>> | undefined;
  let refund = true;
  try {
    if (ctrl.signal.aborted) throw new Error("aborted");
    if (feature === "live-cooking") {
      const photo = params.messages.some(
        (m) =>
          Array.isArray(m.content) && m.content.some((b) => b.type === "image"),
      );
      reservation = await liveQuota.reserve(photo);
      options.onUsage?.(reservation.usage);
    }
    if (ctrl.signal.aborted) throw new Error("aborted");
    refund = false; // Once sent, a timeout may still incur an AI call.
    const response = await fetchWithDeviceRetry(() =>
      fetch(`${API_BASE_URL}/api/claude`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", ...proHeaders() },
        body: JSON.stringify({ ...params, feature }),
      }),
    );
    refund = !response.ok;
    const data = await readResponse(response, feature, options.onUsage);
    const text = data?.content
      ?.filter((b: { type?: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();
    if (!text) {
      refund = true;
      throw new AiApiError("empty-response");
    }
    consumeFreeChat(feature);
    return text;
  } catch (error) {
    if (error instanceof LiveQuotaError && error.usage)
      options.onUsage?.(error.usage);
    if (ctrl.signal.aborted && !options.signal?.aborted)
      throw new AiApiError("timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
    if (reservation) {
      try {
        const usage = await reservation.finish(refund);
        options.onUsage?.(usage);
      } catch {
        /* Keep the reserved count if storage fails. */
      }
    }
  }
}

export async function fetchLiveUsage(signal?: AbortSignal): Promise<LiveUsage> {
  if (signal?.aborted) throw new Error("aborted");
  return liveQuota.getUsage();
}

/**
 * Appel IA sans cache. `feature` dit quelle fonction appelle (Tchopé Pro, utils/proBridge.ts) : tout est réservé aux
 * abonnés sauf `chat` (3 messages gratuits au total). Sans abonnement, l'écran Pro s'ouvre et ProRequiredError est levée.
 */
export async function callClaudeLive(
  params: ClaudeRequest,
  feature: AiFeature,
  options: AiRequestOptions = {},
): Promise<string> {
  // Consentement obligatoire avant tout envoi vers Anthropic (Apple 5.1.1/5.1.2).
  if (!(await requestAiConsent())) throw new AiConsentError();
  assertAiAllowed(feature);
  if (options.signal?.aborted) throw new Error("aborted");
  return postClaude(params, feature, options);
}

export async function fetchRecipeUrl(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(abort, 15_000);
  try {
    const response = await fetchWithDeviceRetry(() =>
      fetch(`${API_BASE_URL}/api/fetch-recipe-url`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", ...proHeaders() },
        body: JSON.stringify({ url }),
      }),
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/** Appel IA avec cache local de 24 h (mêmes règles Tchopé Pro que callClaudeLive, vérifiées AVANT le cache). */
export async function callClaude(
  params: ClaudeRequest,
  feature: AiFeature,
  options: AiRequestOptions = {},
): Promise<string> {
  // Consentement obligatoire avant tout envoi vers Anthropic (Apple 5.1.1/5.1.2).
  if (!(await requestAiConsent())) throw new AiConsentError();
  assertAiAllowed(feature);

  const key = await hashKey(params);

  const cached = await getCache(key);
  if (cached) return cached;

  if (options.signal?.aborted) throw new Error("aborted");
  const text = await postClaude(params, feature, options);
  await setCache(key, text);
  return text;
}
