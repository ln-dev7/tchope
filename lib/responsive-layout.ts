export const READABLE_MAX = 720;
export const PAGE_MAX = 840;

export type LayoutInsets = { top: number; right: number; bottom: number; left: number };

/** Use the current scene, including asymmetric camera / navigation insets. */
export function responsiveLayout(width: number, height: number, insets: LayoutInsets, fontScale = 1) {
  const safeWidth = Math.max(0, width - insets.left - insets.right);
  const safeHeight = Math.max(0, height - insets.top - insets.bottom);
  const contentWidth = Math.min(safeWidth, READABLE_MAX);
  const pageWidth = Math.min(safeWidth, PAGE_MAX);
  const effectiveWidth = pageWidth / Math.max(1, fontScale);
  const gridCols = effectiveWidth < 360 ? 1 : effectiveWidth >= 940 ? 4 : effectiveWidth >= 680 ? 3 : 2;
  const centered = (maxWidth: number) => ({
    width: Math.min(safeWidth, maxWidth),
    alignSelf: 'center' as const,
    marginLeft: insets.left,
    marginRight: insets.right,
  });
  return {
    width, height, safeWidth, safeHeight, contentWidth, pageWidth,
    compact: effectiveWidth < 360,
    wide: effectiveWidth >= 680,
    gridCols,
    landscape: width > height,
    readable: centered(READABLE_MAX),
    page: centered(PAGE_MAX),
    // Each edge is independent: rotating the inner display moves the system UI.
    horizontalInsets: { paddingLeft: insets.left, paddingRight: insets.right },
  };
}
