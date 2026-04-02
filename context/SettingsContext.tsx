import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  language: 'fr',
  notifications: defaultNotifications,
};

type SettingsContextType = {
  settings: Settings;
  updateTheme: (theme: Settings['theme']) => void;
  updateLanguage: (language: Settings['language']) => void;
  updateNotifications: (notifications: Partial<NotificationPreferences>) => void;
  resetFavorites: () => Promise<void>;
  resetUserRecipes: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateTheme: () => {},
  updateLanguage: () => {},
  updateNotifications: () => {},
  resetFavorites: async () => {},
  resetUserRecipes: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings({ ...defaultSettings, ...parsed, notifications: { ...defaultNotifications, ...parsed.notifications } });
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const updateTheme = useCallback(
    (theme: Settings['theme']) => {
      persist({ ...settings, theme });
    },
    [settings, persist],
  );

  const updateLanguage = useCallback(
    (language: Settings['language']) => {
      persist({ ...settings, language });
    },
    [settings, persist],
  );

  const updateNotifications = useCallback(
    (partial: Partial<NotificationPreferences>) => {
      persist({ ...settings, notifications: { ...settings.notifications, ...partial } });
    },
    [settings, persist],
  );

  const resetFavorites = useCallback(async () => {
    await AsyncStorage.removeItem(FAVORITES_KEY);
  }, []);

  const resetUserRecipes = useCallback(async () => {
    await AsyncStorage.removeItem(USER_RECIPES_KEY);
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, updateTheme, updateLanguage, updateNotifications, resetFavorites, resetUserRecipes }}
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
