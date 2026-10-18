import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/constants/design';
import { LIQUID_GLASS } from '@/lib/liquid-glass';

export const AI_FAB_SIZE = 52;

// La fin des listes doit pouvoir remonter au-dessus du bouton ET des onglets.
// Même calcul pour l'overlay et les écrans, y compris avec une grande police.
export function useTabLayout() {
  const { bottom, right } = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const fontExtra = Math.max(0, fontScale - 1) * 24;
  const tabBarHeight = 70 + bottom + fontExtra;
  const fabBottom = LIQUID_GLASS ? bottom + 78 + fontExtra : tabBarHeight + 16;

  return {
    tabBarHeight,
    fabBottom,
    fabRight: Math.max(right + 16, (width - layout.maxWidth) / 2 + 16),
    contentBottom: fabBottom + AI_FAB_SIZE + 20,
  };
}
