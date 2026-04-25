import React, { useEffect, useState } from 'react';
import { View, Modal } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';
import { ONBOARDING_KEY } from '@/app/onboarding';

// ⚠️ To announce a new release:
// 1. Create a new file `vX.Y.Z-<feature>.tsx` next to this one
// 2. Delete the previous release file
// 3. Swap the import below to point at the new file
// 4. Update the matching translation strings in `constants/translations.ts`
import ReleaseContent, { RELEASE_VERSION } from './v1.5.0-notes';

const LAST_SEEN_VERSION_KEY = 'tchope_last_seen_version';

export default function WhatsNewModal() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
        if (currentVersion !== RELEASE_VERSION) return;

        const [lastSeen, onboarded] = await Promise.all([
          AsyncStorage.getItem(LAST_SEEN_VERSION_KEY),
          AsyncStorage.getItem(ONBOARDING_KEY),
        ]);

        // Skip on a fresh install — don't pop "what's new" mid-onboarding.
        // Just record the version so the next upgrade is the first to trigger.
        if (onboarded !== 'true') {
          await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
          return;
        }

        if (lastSeen !== currentVersion) {
          setVisible(true);
        }
      } catch {
        // Never block the app on this side feature
      }
    })();
  }, []);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(
        LAST_SEEN_VERSION_KEY,
        Constants.expoConfig?.version ?? RELEASE_VERSION,
      );
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 12,
            paddingBottom: 24,
            maxHeight: '85%',
          }}>
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#3A3A3A' : '#E0DDDC',
              }}
            />
          </View>

          <ReleaseContent colors={colors} isDark={isDark} t={t} onClose={dismiss} />
        </View>
      </View>
    </Modal>
  );
}
