import React, { useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { AD_UNITS } from '@/constants/ads';

const UNIT_BY_PLACEMENT = {
  home: AD_UNITS.bannerHome,
  recipe: AD_UNITS.bannerRecipe,
} as const;

export default function AdBanner({
  placement = 'home',
  style,
}: {
  placement?: keyof typeof UNIT_BY_PLACEMENT;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : UNIT_BY_PLACEMENT[placement];

  if (!unitId || failed) return null;

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
