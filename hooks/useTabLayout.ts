import { useWindowDimensions } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/constants/design';
import { LIQUID_GLASS } from '@/lib/liquid-glass';

export const AI_FAB_SIZE = 52;

// La fin des listes doit pouvoir remonter au-dessus du bouton ET des onglets.
// Même calcul pour l'overlay et les écrans, y compris avec une grande police.
export function useTabLayout() {
  const { bottom, right, left } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { width } = useSafeAreaFrame();
  const fontExtra = Math.max(0, fontScale - 1) * 24;
  const tabBarHeight = 70 + bottom + fontExtra;
  const fabBottom = LIQUID_GLASS ? bottom + 16 : tabBarHeight + 16;

  return {
    tabBarHeight,
    fabBottom,
    fabRight: Math.max(right + 16, right + Math.max(0, width - left - right - layout.maxWidth) / 2 + 16),
    contentBottom: fabBottom + AI_FAB_SIZE + 20,
  };
}
