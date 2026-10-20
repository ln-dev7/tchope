import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { APP_ICONS, type AppIconId } from '@/constants/app-icons';

type NativeIcons = {
  supportsAlternateIcons: boolean;
  getAppIconName(): string | null;
  setAlternateAppIcon(name: string | null): Promise<string | null>;
};
// Older development builds and Expo Go must keep launching without this module.
const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<NativeIcons>('ExpoAlternateAppIcons');
export const supportsAppIcons = !!native?.supportsAlternateIcons;
let changing = false;
export function currentAppIcon(): AppIconId | null {
  if (!supportsAppIcons || !native) return null;
  const name = native.getAppIconName();
  return APP_ICONS.find(icon => icon.nativeName === name)?.id ?? null;
}
export async function changeAppIcon(id: AppIconId): Promise<AppIconId> {
  if (!supportsAppIcons || !native) throw new Error('unsupported');
  if (changing) throw new Error('busy');
  const entry = APP_ICONS.find(icon => icon.id === id);
  if (!entry) throw new Error('unknown-icon');
  changing = true;
  try {
    if (currentAppIcon() !== id) await native.setAlternateAppIcon(entry.nativeName);
    if (currentAppIcon() !== id) throw new Error('not-applied');
    return id;
  } finally { changing = false; }
}
