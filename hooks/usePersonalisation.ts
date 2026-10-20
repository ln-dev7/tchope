import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { usePro } from '@/context/ProContext';
import { proDict } from '@/constants/pro-translations';
import { DEFAULT_PALETTE, type PaletteId } from '@/constants/themes';
import type { AppIconId } from '@/constants/app-icons';
import { currentAppIcon, changeAppIcon, supportsAppIcons } from '@/lib/app-icons';
import { mayChoosePersonalisation } from '@/lib/personalisation-policy';

export function usePersonalisation() {
  const { settings, ready: settingsReady, setAppIcon, setPalette } = useSettings();
  const { pro, ready: proReady, openPaywall } = usePro();
  const d = proDict[settings.language].personalisation;
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const ready = settingsReady && proReady;
  useEffect(() => {
    if (!settingsReady) return;
    const reconcile = () => {
      if (locked.current) return;
      try {
        const actual = currentAppIcon();
        // The launcher is authoritative after a restart or interrupted native confirmation.
        if (actual !== null && actual !== settings.appIcon) void setAppIcon(actual).catch(() => {});
      } catch { /* Unsupported launchers leave the saved choice alone. */ }
    };
    reconcile();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') reconcile(); });
    return () => sub.remove();
  }, [settingsReady, settings.appIcon, setAppIcon]);

  const choosePalette = useCallback(async (id: PaletteId) => {
    if (!ready || locked.current) return;
    if (!mayChoosePersonalisation(pro, id, settings.palette, DEFAULT_PALETTE)) { openPaywall("settings"); return; }
    if (id === settings.palette) return;
    try { await setPalette(id); } catch { Alert.alert(d.title, d.saveFailed); }
  }, [ready, pro, settings.palette, openPaywall, setPalette, d]);

  const chooseIcon = useCallback(async (id: AppIconId) => {
    if (!ready || locked.current) return;
    if (!mayChoosePersonalisation(pro, id, settings.appIcon, 'default')) { openPaywall("settings"); return; }
    if (id === settings.appIcon) return;
    if (!supportsAppIcons) { Alert.alert(d.error, d.unavailable); return; }
    locked.current = true; setBusy(true);
    try {
      const applied = await changeAppIcon(id);
      try { await setAppIcon(applied); } catch { Alert.alert(d.title, d.saveFailed); }
    } catch { Alert.alert(d.error, d.failed); }
    finally { locked.current = false; setBusy(false); }
  }, [ready, pro, settings.appIcon, openPaywall, setAppIcon, d]);
  return { settings, pro, ready, busy, chooseIcon, choosePalette, d };
}
