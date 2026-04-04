import type { LicenseStatus } from './types';
import type { TranslationKey } from '@/constants/translations';

export function getLicenseErrorMessage(
  status: LicenseStatus,
  t: (key: TranslationKey) => string,
): string {
  switch (status) {
    case 'invalid':
      return t('licenseInvalid');
    case 'expired':
      return t('licenseExpired');
    case 'revoked':
      return t('licenseRevoked');
    case 'device_limit':
      return t('licenseDeviceLimit');
    case 'inactive':
      return t('licenseInactive');
    case 'network_error':
      return t('licenseNetworkError');
    default:
      return t('licenseUnknownError');
  }
}
