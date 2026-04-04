import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LicenseInfo } from './types';

const LICENSE_KEY = 'tchope_license';
const DEVICE_ID_KEY = 'tchope_device_id';

export async function storeLicense(info: LicenseInfo): Promise<void> {
  await AsyncStorage.setItem(LICENSE_KEY, JSON.stringify(info));
}

export async function getStoredLicense(): Promise<LicenseInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(LICENSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearStoredLicense(): Promise<void> {
  await AsyncStorage.removeItem(LICENSE_KEY);
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Generate UUID v4
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
