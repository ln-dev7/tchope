import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Platform, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';

type RatingContextType = {
  requestRating: () => Promise<void>;
  openStoreListing: () => Promise<void>;
};

const STORE_URL = Platform.select({
  android: 'https://play.google.com/store/apps/details?id=com.lndev.tchope',
  default: 'https://apps.apple.com/app/tchope/id6791111069',
});

const RatingContext = createContext<RatingContextType>({
  requestRating: async () => {},
  openStoreListing: async () => {},
});

export function useRating() {
  return useContext(RatingContext);
}

/** Rating is only requested by the user's explicit action in Settings. */
export function RatingProvider({ children }: { children: React.ReactNode }) {
  const openStoreListing = useCallback(async () => {
    try {
      await Linking.openURL(STORE_URL);
    } catch {
      // The store may be unavailable on this device.
    }
  }, []);

  const requestRating = useCallback(async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // Fall back to the listing if the native review API is unavailable.
    }
    await openStoreListing();
  }, [openStoreListing]);

  const value = useMemo(() => ({ requestRating, openStoreListing }), [requestRating, openStoreListing]);
  return <RatingContext.Provider value={value}>{children}</RatingContext.Provider>;
}
