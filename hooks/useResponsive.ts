import { useWindowDimensions } from "react-native";
import { useSafeAreaFrame, useSafeAreaInsets } from "react-native-safe-area-context";
import { responsiveLayout } from "@/lib/responsive-layout";

/** Current scene size and safe area, including a side tab rail and modal presentations. */
export { READABLE_MAX } from "@/lib/responsive-layout";

/** À étaler dans le `contentContainerStyle` d'une liste ou d'un ScrollView vertical : contenu centré, plafonné. */
export function useResponsive() {
  const { fontScale } = useWindowDimensions();
  const { width, height } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  return responsiveLayout(width, height, insets, fontScale);
}
