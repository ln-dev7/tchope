import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserRecipes } from '@/hooks/useUserRecipes';
import { useToast } from '@/hooks/useToast';
import { useRating } from '@/context/RatingContext';
import { useLicense } from '@/context/LicenseContext';
import LicenseActivation from '@/components/premium/LicenseActivation';
import TchopePlusScreen from '@/components/premium/TchopePlusScreen';
import type { Settings } from '@/types';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { settings, updateTheme, updateLanguage } = useSettings();
  const { clearAll: clearFavorites } = useFavorites();
  const { clearAll: clearUserRecipes } = useUserRecipes();
  const { toast } = useToast();
  const { requestRating } = useRating();
  const { isPremium, licenseStatus } = useLicense();
  const router = useRouter();
  const [showPlusModal, setShowPlusModal] = useState(false);

  const handleClearFavorites = () => {
    Alert.alert(t('clearConfirm'), t('clearConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: () => { clearFavorites(); toast(t('clearFavorites'), 'done'); },
      },
    ]);
  };

  const handleClearUserRecipes = () => {
    Alert.alert(t('clearConfirm'), t('clearConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: () => { clearUserRecipes(); toast(t('clearUserRecipes'), 'done'); },
      },
    ]);
  };

  const handleResetAllData = () => {
    Alert.alert(t('resetAllData'), t('resetAllDataConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: async () => {
          // Preserve license, device ID and usage quotas
          const keysToPreserve = [
            'tchope_license',
            'tchope_device_id',
            'tchope_free_messages',
            'tchope_free_messages_date',
            'tchope_image_quota',
          ];
          const saved = await Promise.all(
            keysToPreserve.map(async (key) => [key, await AsyncStorage.getItem(key)] as const)
          );
          await AsyncStorage.clear();
          await Promise.all(
            saved.filter(([, val]) => val !== null).map(([key, val]) => AsyncStorage.setItem(key, val!))
          );
          toast(t('resetAllDataDone'), 'done');
          router.replace('/onboarding' as any);
        },
      },
    ]);
  };

  const themeOptions: { key: Settings['theme']; icon: string; label: string }[] = [
    { key: 'light', icon: 'sunny-outline', label: t('light') },
    { key: 'dark', icon: 'moon-outline', label: t('dark') },
    { key: 'system', icon: 'phone-portrait-outline', label: t('system') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.accent, letterSpacing: -1.2 }}>
          {t('settings')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 + bottom, paddingHorizontal: 24, gap: 40, paddingTop: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Tchopé Plus */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              paddingHorizontal: 8,
            }}>
            {t('tchopePlus')}
          </Text>
          {isPremium || licenseStatus === 'expired' ? (
            <LicenseActivation />
          ) : (
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowPlusModal(true)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: isDark ? `${colors.accent}12` : `${colors.accent}08`,
                  borderRadius: 20,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderWidth: 1.5,
                  borderColor: isDark ? `${colors.accent}25` : `${colors.accent}15`,
                }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    {t('upgradeToPremium')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {t('featurePrice')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
              <LicenseActivation />
            </View>
          )}
        </View>

        {/* Plus Modal */}
        <Modal visible={showPlusModal} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <TchopePlusScreen onClose={() => setShowPlusModal(false)} />
          </View>
        </Modal>

        {/* Appearance */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              paddingHorizontal: 8,
            }}>
            {t('appearance')}
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 32,
              padding: 8,
              flexDirection: 'row',
              gap: 8,
            }}>
            {themeOptions.map((option) => {
              const isActive = settings.theme === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => updateTheme(option.key)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderRadius: 32,
                    backgroundColor: isActive ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                    ...(isActive
                      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                      : {}),
                  }}>
                  <View
                    style={{
                      width: '100%',
                      paddingVertical: 8,
                      borderRadius: 16,
                      alignItems: 'center',
                      backgroundColor:
                        option.key === 'light'
                          ? '#FFFFFF'
                          : option.key === 'dark'
                            ? '#1C1917'
                            : undefined,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: isActive ? colors.accentLight : 'transparent',
                    }}>
                    <Ionicons
                      name={option.icon as any}
                      size={22}
                      color={
                        option.key === 'dark'
                          ? '#FFFFFF'
                          : option.key === 'light'
                            ? colors.accent
                            : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? '600' : '500',
                      color: isActive ? colors.accent : colors.textSecondary,
                      textAlign: 'center',
                    }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              paddingHorizontal: 8,
            }}>
            {t('language')}
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 32,
              overflow: 'hidden',
            }}>
            <TouchableOpacity
              onPress={() => updateLanguage('fr')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: settings.language === 'fr' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
                <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                  {t('french')}
                </Text>
              </View>
              {settings.language === 'fr' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateLanguage('en')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 20,
                backgroundColor: settings.language === 'en' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
                <Text style={{ fontSize: 16, fontWeight: '500', color: settings.language === 'en' ? colors.text : colors.textSecondary }}>
                  English
                </Text>
              </View>
              {settings.language === 'en' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <TouchableOpacity
          onPress={() => router.push('/notification-settings' as any)}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 32,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="notifications-outline" size={20} color="#A855F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {t('notifications')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {t('notificationsSubtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Data */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              paddingHorizontal: 8,
            }}>
            {t('data')}
          </Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={handleResetAllData}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 32,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(231,76,60,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="nuclear" size={20} color="#E74C3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#E74C3C' }}>
                  {t('resetAllData')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {t('resetAllDataDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:leonelngoya@gmail.com')}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 32,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(145,71,0,0.15)' : 'rgba(145,71,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mail-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {t('contactMe')}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                leonelngoya@gmail.com
              </Text>
            </View>
            <Ionicons name="open-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://t.me/ln_dev7')}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 32,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(0,136,204,0.15)' : 'rgba(0,136,204,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="send-outline" size={20} color="#0088CC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                Telegram
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                @ln_dev7
              </Text>
            </View>
            <Ionicons name="open-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Rate App */}
        <TouchableOpacity
          onPress={requestRating}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 32,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? 'rgba(245,158,66,0.15)' : 'rgba(145,71,0,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="star" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {t('rateApp')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {t('rateAppSubtitle')}
            </Text>
          </View>
          <Ionicons name="open-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Support */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://ecaefmew.mychariow.shop/prd_3cu1s0')}
          activeOpacity={0.85}
          style={{
            borderRadius: 32,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            backgroundColor: isDark ? 'rgba(249,127,6,0.1)' : 'rgba(249,127,6,0.08)',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(249,127,6,0.2)' : 'rgba(249,127,6,0.15)',
          }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="heart" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
              {t('supportMe')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {t('supportSubtitle')}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
        </TouchableOpacity>

        {/* About */}
        <View style={{ gap: 16, paddingBottom: 48 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              paddingHorizontal: 8,
            }}>
            {t('about')}
          </Text>
          <View
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderRadius: 32,
              padding: 25,
              gap: 24,
              borderWidth: 1,
              borderColor: 'rgba(175,173,172,0.15)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('version')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent, fontFamily: 'monospace' }}>
                {Constants.expoConfig?.version ?? '1.0.0'}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <TouchableOpacity
              onPress={() => Linking.openURL('https://lndev.me')}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('developer')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
                  lndev.me
                </Text>
                <Ionicons name="open-outline" size={12} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <TouchableOpacity
              onPress={() => Linking.openURL('https://github.com/ln-dev7/tchope')}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>GitHub</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
                  ln-dev7/tchope
                </Text>
                <Ionicons name="open-outline" size={12} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <TouchableOpacity
              onPress={() => Linking.openURL('https://tchope.lndev.me/fr/privacy')}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('privacyPolicy')}</Text>
              <Ionicons name="open-outline" size={12} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ paddingTop: 16, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                {t('madeWith')}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: -0.5,
                  textAlign: 'center',
                }}>
                © {new Date().getFullYear()} Leonel Ngoya
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
