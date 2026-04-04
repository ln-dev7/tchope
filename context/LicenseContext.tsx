import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import {
  validateLicense,
  activateOnDevice,
  validateStoredLicense,
} from '@/services/license/validator';
import { storeLicense, clearStoredLicense } from '@/services/license/storage';
import type { LicenseInfo, LicenseValidationResult } from '@/services/license/types';

interface LicenseContextValue {
  isPremium: boolean;
  isLoading: boolean;
  licenseInfo: LicenseInfo | null;
  activateLicense: (key: string) => Promise<LicenseValidationResult>;
  deactivateLicense: () => Promise<void>;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue>({
  isPremium: false,
  isLoading: true,
  licenseInfo: null,
  activateLicense: async () => ({ success: false, status: 'none' }),
  deactivateLicense: async () => {},
  refreshLicense: async () => {},
});

const REVALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24h

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const lastValidation = useRef(0);

  const refreshLicense = useCallback(async () => {
    const result = await validateStoredLicense();
    setIsPremium(result.success);
    setLicenseInfo(result.info ?? null);
    lastValidation.current = Date.now();
  }, []);

  // Initial validation
  useEffect(() => {
    (async () => {
      await refreshLicense();
      setIsLoading(false);
    })();
  }, []);

  // Re-validate when app comes to foreground (max every 24h)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastValidation.current > REVALIDATION_INTERVAL) {
        refreshLicense();
      }
    });
    return () => sub.remove();
  }, [refreshLicense]);

  const activateLicense = useCallback(async (key: string): Promise<LicenseValidationResult> => {
    // Activate on device first (Chariow marks license as active on first activation)
    const activation = await activateOnDevice(key);
    if (!activation.success) return activation;

    // Then validate to get full license info (expiry, etc.)
    const validation = await validateLicense(key);

    const info: LicenseInfo = {
      key,
      status: 'valid',
      expiresAt: validation.info?.expiresAt ?? null,
      activationsRemaining: activation.info?.activationsRemaining ?? null,
      validatedAt: new Date().toISOString(),
    };

    await storeLicense(info);
    setLicenseInfo(info);
    setIsPremium(true);
    lastValidation.current = Date.now();

    return { success: true, status: 'valid', info };
  }, []);

  const deactivateLicense = useCallback(async () => {
    await clearStoredLicense();
    setLicenseInfo(null);
    setIsPremium(false);
  }, []);

  return (
    <LicenseContext.Provider
      value={{ isPremium, isLoading, licenseInfo, activateLicense, deactivateLicense, refreshLicense }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
