export interface ChariowLicenseData {
  key: string;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  activations: {
    current: number;
    limit: number;
    remaining: number;
  } | null;
}

export interface ValidateLicenseResponse {
  valid: boolean;
  status: string;
  license?: ChariowLicenseData;
  error?: string;
}

export interface ActivateLicenseResponse {
  success: boolean;
  deviceIdentifier?: string;
  activationsRemaining?: number | null;
  error?: string;
}
