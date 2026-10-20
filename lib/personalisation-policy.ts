// A retained choice is not a new Pro entitlement. Default reset is always free.
export function mayChoosePersonalisation(pro: boolean, choice: string, current: string, defaultId: string): boolean {
  return pro || choice === defaultId || choice === current;
}
