import React, { useState } from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { useLicense } from '@/context/LicenseContext';

// Blocs "Tchope Banner Ad" — Android + iOS ("Tchope IOS", créé le 9 juillet 2026).
const AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      android: 'ca-app-pub-2222017759396595/2143678108',
      ios: 'ca-app-pub-2222017759396595/8194150944',
    });

export default function AdBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const { isPremium } = useLicense();
  const [failed, setFailed] = useState(false);

  if (isPremium || !AD_UNIT_ID || failed) return null;

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
