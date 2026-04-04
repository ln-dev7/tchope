import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/hooks/useTheme';

const VERSION_CHECK_KEY = 'last_version_check';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id<YOUR_APP_ID>', // TODO: replace with real App Store ID
  android: 'https://play.google.com/store/apps/details?id=com.lndev.tchope',
}) ?? '';

function compareVersions(current: string, min: string): boolean {
  const a = current.split('.').map(Number);
  const b = min.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

export default function UpdateModal() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    checkVersion();
  }, []);

  async function checkVersion() {
    try {
      const lastCheck = await AsyncStorage.getItem(VERSION_CHECK_KEY);
      if (lastCheck && Date.now() - Number(lastCheck) < CHECK_INTERVAL) return;

      const response = await fetch(`${API_BASE_URL}/api/version`);
      if (!response.ok) return;

      await AsyncStorage.setItem(VERSION_CHECK_KEY, String(Date.now()));

      const data = await response.json();
      const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
      const isOutdated = compareVersions(currentVersion, data.minVersion);
      if (isOutdated) {
        setForceUpdate(data.forceUpdate ?? false);
        setVisible(true);
      }
    } catch {
      // Silently fail — don't block the app if the check fails
    }
  }

  function handleUpdate() {
    Linking.openURL(STORE_URL);
  }

  function handleLater() {
    if (!forceUpdate) {
      setVisible(false);
    }
  }

  const bgColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#F5F5F5' : '#1A1A1A';
  const subtextColor = isDark ? '#A0A0A0' : '#666666';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: bgColor, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#2A2A2A' : '#FFF3E0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="arrow-up-circle-outline" size={36} color="#F59E0B" />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
            {t('updateAvailable')}
          </Text>

          <Text style={{ fontSize: 14, color: subtextColor, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            {forceUpdate ? t('updateForceMessage') : t('updateMessage')}
          </Text>

          <TouchableOpacity
            onPress={handleUpdate}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#F59E0B',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 24,
              width: '100%',
              alignItems: 'center',
              marginBottom: forceUpdate ? 0 : 10,
            }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
              {t('updateNow')}
            </Text>
          </TouchableOpacity>

          {!forceUpdate && (
            <TouchableOpacity onPress={handleLater} activeOpacity={0.7} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, color: subtextColor, fontWeight: '500' }}>
                {t('updateLater')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
