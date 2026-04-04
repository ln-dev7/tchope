export type LicenseStatus =
  | 'valid'
  | 'expired'
  | 'invalid'
  | 'revoked'
  | 'device_limit'
  | 'inactive'
  | 'network_error'
  | 'none';

export interface LicenseInfo {
  key: string;
  status: LicenseStatus;
  expiresAt: string | null;
  activationsRemaining: number | null;
  validatedAt: string;
}

export interface LicenseValidationResult {
  success: boolean;
  status: LicenseStatus;
  info?: LicenseInfo;
  errorMessage?: string;
}
