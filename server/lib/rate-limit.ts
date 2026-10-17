/* Limiteur de débit EN MÉMOIRE pour les endpoints publics coûteux (TravorAI).
   Fenêtres glissantes par clé (IP) : minute + jour.

   Limite connue : la mémoire est PAR INSTANCE serveur. En serverless (Vercel),
   plusieurs instances peuvent coexister → les plafonds réels sont un multiple
   du plafond configuré. C'est suffisant contre l'abus « script en boucle » ;
   pour un plafond strict multi-instances, brancher un store partagé
   (Upstash Redis / Vercel KV) derrière la même interface. */

interface Bucket {
  minuteCount: number;
  minuteStart: number;
  dayCount: number;
  dayStart: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
/** Purge des entrées inactives au-delà de ce nombre de clés. */
const MAX_KEYS = 5_000;

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Requêtes max par minute (défaut 8). */
  perMinute?: number;
  /** Requêtes max par 24 h (défaut 120). */
  perDay?: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Raison du refus, le cas échéant. */
  reason?: "minute" | "day";
}

/** Enregistre un hit pour `key` et dit si la requête est autorisée. */
export function checkRateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const perMinute = opts.perMinute ?? 8;
  const perDay = opts.perDay ?? 120;
  const now = Date.now();

  let b = buckets.get(key);
  if (!b) {
    b = { minuteCount: 0, minuteStart: now, dayCount: 0, dayStart: now };
    buckets.set(key, b);
  }
  if (now - b.minuteStart >= MINUTE_MS) {
    b.minuteCount = 0;
    b.minuteStart = now;
  }
  if (now - b.dayStart >= DAY_MS) {
    b.dayCount = 0;
    b.dayStart = now;
  }
  b.minuteCount++;
  b.dayCount++;

  // Purge simple pour éviter une croissance mémoire infinie.
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (now - v.minuteStart > 10 * MINUTE_MS && now - v.dayStart > DAY_MS) buckets.delete(k);
      if (buckets.size <= MAX_KEYS) break;
    }
  }

  if (b.minuteCount > perMinute) return { ok: false, reason: "minute" };
  if (b.dayCount > perDay) return { ok: false, reason: "day" };
  return { ok: true };
}

/** Extrait une clé client raisonnable depuis les en-têtes (Vercel/proxy). */
export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
