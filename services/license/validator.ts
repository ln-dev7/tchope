import { validateLicenseKey, activateLicenseOnDevice } from '../chariow/api';
import { getStoredLicense, storeLicense, getOrCreateDeviceId } from './storage';
import type { LicenseStatus, LicenseValidationResult } from './types';

const OFFLINE_GRACE_DAYS = 7;

function mapApiStatus(apiStatus: string): LicenseStatus {
  switch (apiStatus) {
    case 'active':
      return 'valid';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    case 'inactive':
      return 'inactive';
    case 'invalid':
      return 'invalid';
    default:
      return 'invalid';
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && (err.message.includes('Network') || err.message.includes('fetch'))) {
    return true;
  }
  return false;
}

export async function validateLicense(key: string): Promise<LicenseValidationResult> {
  try {
    const response = await validateLicenseKey(key);

    if (response.valid && response.license) {
      const info = {
        key,
        status: 'valid' as LicenseStatus,
        expiresAt: response.license.expiresAt,
        activationsRemaining: response.license.activations?.remaining ?? null,
        validatedAt: new Date().toISOString(),
      };
      return { success: true, status: 'valid', info };
    }

    // API returned a valid response but license is not valid
    const status = mapApiStatus(response.status);
    return { success: false, status };
  } catch (err) {
    console.warn('[License] validateLicense error:', err);
    if (isNetworkError(err)) {
      return { success: false, status: 'network_error' };
    }
    // Server error or unexpected — treat as invalid to not confuse with offline
    return { success: false, status: 'invalid' };
  }
}

export async function activateOnDevice(key: string): Promise<LicenseValidationResult> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await activateLicenseOnDevice(key, deviceId);

    if (response.success) {
      return {
        success: true,
        status: 'valid',
        info: {
          key,
          status: 'valid',
          expiresAt: null,
          activationsRemaining: response.activationsRemaining ?? null,
          validatedAt: new Date().toISOString(),
        },
      };
    }

    if (response.error === 'device_limit') {
      return { success: false, status: 'device_limit' };
    }
    if (response.error === 'invalid') {
      return { success: false, status: 'invalid' };
    }

    return { success: false, status: 'invalid' };
  } catch (err) {
    console.warn('[License] activateOnDevice error:', err);
    if (isNetworkError(err)) {
      return { success: false, status: 'network_error' };
    }
    return { success: false, status: 'invalid' };
  }
}

export async function validateStoredLicense(): Promise<LicenseValidationResult> {
  const stored = await getStoredLicense();
  if (!stored) {
    return { success: false, status: 'none' };
  }

  // Try online validation
  const result = await validateLicense(stored.key);

  if (result.success && result.info) {
    await storeLicense(result.info);
    return result;
  }

  // If network error, check grace period
  if (result.status === 'network_error') {
    const daysSinceValidation = Math.floor(
      (Date.now() - new Date(stored.validatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceValidation <= OFFLINE_GRACE_DAYS) {
      return { success: true, status: 'valid', info: stored };
    }
  }

  return result;
}
