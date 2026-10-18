/** Local weekly Live allowance. Reinstalling the app can reset it (intentional for now). */
export const LIVE_WEEKLY_LIMIT = 100;
export const LIVE_WEEKLY_PHOTOS = 20;
export const LIVE_QUOTA_KEY = "tchope_live_weekly_quota";
export interface LiveUsage {
  limit: number;
  used: number;
  remaining: number;
  photoLimit: number;
  photosUsed: number;
  photosRemaining: number;
  resetsAt: string;
}
type Record = { week: string; used: number; photos: number };
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};
export class LiveQuotaError extends Error {
  usage?: LiveUsage;
  constructor(code: string, usage?: LiveUsage) {
    super(code);
    this.name = "LiveQuotaError";
    this.usage = usage;
  }
}
export function weekWindow(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return {
    week: d.toISOString().slice(0, 10),
    reset: new Date(d.getTime() + 7 * 86400000).toISOString(),
  };
}
export function createLiveQuota(storage: Storage, clock = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  let inFlight = false;
  function serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  }
  async function read(): Promise<Record> {
    const { week } = weekWindow(clock());
    let raw: string | null;
    try {
      raw = await storage.getItem(LIVE_QUOTA_KEY);
    } catch {
      throw new LiveQuotaError("quota-unavailable");
    }
    if (raw)
      try {
        const data = JSON.parse(raw);
        if (
          data.week === week &&
          Number.isInteger(data.used) &&
          data.used >= 0 &&
          Number.isInteger(data.photos) &&
          data.photos >= 0 &&
          data.photos <= data.used
        )
          return data;
      } catch {
        /* Same recovery policy as the existing local image allowance. */
      }
    return { week, used: 0, photos: 0 };
  }
  function usage(data: Record): LiveUsage {
    return {
      limit: LIVE_WEEKLY_LIMIT,
      used: data.used,
      remaining: Math.max(0, LIVE_WEEKLY_LIMIT - data.used),
      photoLimit: LIVE_WEEKLY_PHOTOS,
      photosUsed: data.photos,
      photosRemaining: Math.max(0, LIVE_WEEKLY_PHOTOS - data.photos),
      resetsAt: weekWindow(clock()).reset,
    };
  }
  async function write(data: Record) {
    try {
      await storage.setItem(LIVE_QUOTA_KEY, JSON.stringify(data));
    } catch {
      throw new LiveQuotaError("quota-unavailable");
    }
  }
  const getUsage = () => serial(async () => usage(await read()));
  const reserve = (photo: boolean) =>
    serial(async () => {
      const data = await read();
      if (inFlight) throw new LiveQuotaError("live-busy", usage(data));
      if (data.used >= LIVE_WEEKLY_LIMIT)
        throw new LiveQuotaError("weekly-limit", usage(data));
      if (photo && data.photos >= LIVE_WEEKLY_PHOTOS)
        throw new LiveQuotaError("weekly-photo-limit", usage(data));
      data.used++;
      if (photo) data.photos++;
      await write(data);
      inFlight = true;
      let finished = false;
      return {
        usage: usage(data),
        finish: (refund: boolean) =>
          serial(async () => {
            if (finished) return usage(await read());
            // An older request cannot refund the new week's allowance.
            try {
              const latest = await read();
              if (refund && latest.week === data.week) {
                latest.used = Math.max(0, latest.used - 1);
                if (photo) latest.photos = Math.max(0, latest.photos - 1);
                await write(latest);
              }
              return usage(latest);
            } finally {
              finished = true;
              inFlight = false;
            }
          }),
      };
    });
  return { getUsage, reserve };
}
