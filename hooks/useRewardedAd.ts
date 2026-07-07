import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Blocs "TchopAI Rewarded Message" — Android + iOS ("Tchope IOS", créé le 9 juillet 2026).
const AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      android: 'ca-app-pub-2222017759396595/3107451588',
      ios: 'ca-app-pub-2222017759396595/8002579254',
    });

const RETRY_DELAY_MS = 60_000;

export function useRewardedAd() {
  const [ready, setReady] = useState(false);
  const adRef = useRef<RewardedAd | null>(null);
  const onRewardRef = useRef<(() => void) | null>(null);
  const earnedRef = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!AD_UNIT_ID) return;

    const ad = RewardedAd.createForAdRequest(AD_UNIT_ID, {
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
  }, []);

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
