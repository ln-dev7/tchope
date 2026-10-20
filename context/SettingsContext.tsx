import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from '@/constants/themes';
import { isAppIconId, type AppIconId } from '@/constants/app-icons';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
import type { Settings, NotificationPreferences } from '@/types';

const SETTINGS_KEY = 'tchope_settings';
const FAVORITES_KEY = 'tchope_favorites';
const USER_RECIPES_KEY = 'tchope_user_recipes';

const defaultNotifications: NotificationPreferences = {
  mealReminder: true,
  mealReminderTime: '11:30',
  recipeOfTheDay: true,
  recipeOfTheDayTime: '09:00',
  shoppingListReminder: true,
  shoppingListReminderTime: '08:00',
};

const defaultSettings: Settings = {
  theme: 'light',
  palette: DEFAULT_PALETTE,
  appIcon: 'default',
  language: 'fr',
  notifications: defaultNotifications,
  aiConsent: false,
};

type SettingsContextType = {
  settings: Settings;
  setPalette: (palette: PaletteId) => Promise<void>;
  setAppIcon: (appIcon: AppIconId) => Promise<void>;
  ready: boolean;
  updateTheme: (theme: Settings['theme']) => void;
  updateLanguage: (language: Settings['language']) => void;
  updateNotifications: (notifications: Partial<NotificationPreferences>) => void;
  updateAiConsent: (value: boolean) => void;
  resetFavorites: () => Promise<void>;
  resetUserRecipes: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setPalette: async () => {},
  setAppIcon: async () => {},
  ready: false,
  updateTheme: () => {},
  updateLanguage: () => {},
  updateNotifications: () => {},
  updateAiConsent: () => {},
  resetFavorites: async () => {},
  resetUserRecipes: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Keep native controls and the Duo system area aligned with the app.
      // Clearing the override lets "system" follow future OS theme changes.
      Appearance.setColorScheme(settings.theme === 'system' ? 'auto' : settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings({ ...defaultSettings, ...parsed, palette: isPaletteId(parsed.palette) ? parsed.palette : DEFAULT_PALETTE, appIcon: isAppIconId(parsed.appIcon) ? parsed.appIcon : "default", notifications: { ...defaultNotifications, ...parsed.notifications } });
        } catch {}
      }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  // Serialize all settings writes, including a language/mode change during icon confirmation.
  const writes = React.useRef(Promise.resolve());
  const persist = useCallback((next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
    const write = writes.current.catch(() => {}).then(() =>
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    );
    writes.current = write;
    // Legacy void setters remain safe; personalisation awaits the original rejection to inform the user.
    void write.catch(() => {});
    return write;
  }, []);
  const savePersonalisation = useCallback((patch: Partial<Pick<Settings, 'palette' | 'appIcon'>>) =>
    persist({ ...settingsRef.current, ...patch }), [persist]);
  const setPalette = useCallback((palette: PaletteId) => savePersonalisation({ palette }), [savePersonalisation]);
  const setAppIcon = useCallback((appIcon: AppIconId) => savePersonalisation({ appIcon }), [savePersonalisation]);

  const updateTheme = useCallback(
    (theme: Settings['theme']) => {
      persist({ ...settingsRef.current, theme });
    },
    [persist],
  );

  const updateLanguage = useCallback(
    (language: Settings['language']) => {
      persist({ ...settingsRef.current, language });
    },
    [persist],
  );

  const updateNotifications = useCallback(
    (partial: Partial<NotificationPreferences>) => {
      persist({ ...settingsRef.current, notifications: { ...settingsRef.current.notifications, ...partial } });
    },
    [persist],
  );

  const updateAiConsent = useCallback(
    (value: boolean) => {
      persist({ ...settingsRef.current, aiConsent: value });
    },
    [persist],
  );

  const resetFavorites = useCallback(async () => {
    await AsyncStorage.removeItem(FAVORITES_KEY);
  }, []);

  const resetUserRecipes = useCallback(async () => {
    await AsyncStorage.removeItem(USER_RECIPES_KEY);
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, setPalette, setAppIcon, ready, updateTheme, updateLanguage, updateNotifications, updateAiConsent, resetFavorites, resetUserRecipes }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

export { SettingsContext };
