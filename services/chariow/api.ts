import type { ValidateLicenseResponse, ActivateLicenseResponse } from './types';
import { API_BASE_URL } from '@/constants/api';

export async function validateLicenseKey(key: string): Promise<ValidateLicenseResponse> {
  const response = await fetch(`${API_BASE_URL}/api/validate-license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: key }),
  });

  const data = await response.json();

  // Server returned a structured response (even on error)
  if (data.valid !== undefined || data.status) {
    return data;
  }

  // Unexpected error
  if (data.error) {
    console.warn('[Chariow] validate error:', data.error);
    throw new Error(data.error);
  }

  throw new Error(`HTTP ${response.status}`);
}

export async function activateLicenseOnDevice(
  key: string,
  deviceId: string,
): Promise<ActivateLicenseResponse> {
  const response = await fetch(`${API_BASE_URL}/api/activate-license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: key, deviceId }),
  });

  const data = await response.json();

  // Server returned a structured response
  if (data.success !== undefined) {
    return data;
  }

  if (data.error) {
    console.warn('[Chariow] activate error:', data.error);
    throw new Error(data.error);
  }

  throw new Error(`HTTP ${response.status}`);
}

export async function deactivateLicenseOnDevice(
  key: string,
  deviceId: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/deactivate-license`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: key, deviceId }),
  });

  return response.json();
}
