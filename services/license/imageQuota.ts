import AsyncStorage from '@react-native-async-storage/async-storage';

const QUOTA_KEY = 'tchope_image_quota';
const DAILY_LIMIT = 20;

type QuotaData = {
  count: number;
  date: string; // YYYY-MM-DD
};

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function getQuotaData(): Promise<QuotaData> {
  try {
    const raw = await AsyncStorage.getItem(QUOTA_KEY);
    if (raw) {
      const data: QuotaData = JSON.parse(raw);
      if (data.date === getTodayDate()) {
        return data;
      }
    }
  } catch {
    // corrupted data, reset
  }
  // New day or no data — start fresh
  return { count: 0, date: getTodayDate() };
}

async function saveQuotaData(data: QuotaData): Promise<void> {
  await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(data));
}

export async function canSendImage(): Promise<boolean> {
  const data = await getQuotaData();
  return data.count < DAILY_LIMIT;
}

export async function incrementImageCount(): Promise<void> {
  const data = await getQuotaData();
  data.count += 1;
  await saveQuotaData(data);
}

export async function getImageQuota(): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const data = await getQuotaData();
  return {
    used: data.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - data.count),
  };
}

export async function getRemainingImages(): Promise<number> {
  const data = await getQuotaData();
  return Math.max(0, DAILY_LIMIT - data.count);
}

export const IMAGE_DAILY_LIMIT = DAILY_LIMIT;
