import { useState, useEffect, useRef, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const RETRY_DELAY_MS = 60_000;

// `unitId` : un bloc de constants/ads.ts (AD_UNITS.rewarded*) — un bloc
// distinct par placement pour suivre l'eCPM de chacun dans AdMob.
export function useRewardedAd(unitId: string | undefined) {
  const adUnitId = __DEV__ ? TestIds.REWARDED : unitId;
  const [ready, setReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const onRewardRef = useRef<(() => void) | null>(null);
  const earnedRef = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!adUnitId) return;

    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = ad;

    const subs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setReady(true)),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earnedRef.current = true;
      }),
      // La récompense n'est accordée qu'à la fermeture : l'écran est de nouveau
      // interactif et l'utilisateur a bien visionné jusqu'au bout.
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        if (earnedRef.current) onRewardRef.current?.();
        earnedRef.current = false;
        onRewardRef.current = null;
        setReady(false);
        ad.load();
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        setReady(false);
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => ad.load(), RETRY_DELAY_MS);
      }),
    ];

    ad.load();

    return () => {
      subs.forEach((unsubscribe) => unsubscribe());
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [adUnitId]);

  const show = useCallback(
    (onReward: () => void) => {
      if (!ready || !adRef.current) return false;
      onRewardRef.current = onReward;
      adRef.current.show();
      return true;
    },
    [ready]
  );

  return { ready, show };
}
