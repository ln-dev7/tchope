// Retained choices remain available after expiry. Free choices are independent.
export const FREE_ICON = "plantain";
export const FREE_PALETTE = "plantain";
export function mayChoosePersonalisation(pro: boolean, choice: string, current: string, defaultId: string, freeId?: string): boolean {
  return pro || choice === defaultId || choice === current || choice === freeId;
}
