import { useLicense } from '@/context/LicenseContext';

export function usePremiumFeature() {
  const { isPremium } = useLicense();
  return { isPremium };
}
