import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useLicense } from '@/context/LicenseContext';
import { useToast } from '@/hooks/useToast';
import { getLicenseErrorMessage } from '@/services/license/errors';
import { CHARIOW_URL_MONTHLY } from '@/constants/translations';

export default function LicenseActivation() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { isPremium, licenseInfo, activateLicense, deactivateLicense, refreshLicense } = useLicense();
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isFr = settings.language === 'fr';

  const handleActivate = async () => {
    const key = licenseKey.trim();
    if (!key) {
      setError(t('licenseRequired'));
      return;
    }

    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await activateLicense(key);
    setLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(t('licenseActivated'), 'done');
      setLicenseKey('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getLicenseErrorMessage(result.status, t));
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      t('deactivate'),
      isFr
        ? 'Vous allez être redirigé vers Telegram pour envoyer une demande de désactivation. Le traitement prend 24h maximum.'
        : 'You will be redirected to Telegram to send a deactivation request. Processing takes up to 24 hours.',
      [
        { text: isFr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: isFr ? 'Continuer' : 'Continue',
          onPress: () => {
            const key = licenseInfo?.key ?? '';
            const msg = isFr
              ? `Bonjour LN, stp voici ma licence : ${key}. Je souhaite désactiver Tchopé Plus sur cet appareil. Merci !`
              : `Hi LN, here is my license: ${key}. I would like to deactivate Tchopé Plus on this device. Thanks!`;
            const url = `https://t.me/ln_dev7?text=${encodeURIComponent(msg)}`;
            Linking.openURL(url);
          },
        },
      ],
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Active license view
  if (isPremium && licenseInfo) {
    return (
      <View style={{ gap: 16 }}>
        {/* Active badge */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(76,175,80,0.1)' : 'rgba(10,106,29,0.06)',
            borderRadius: 20,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(76,175,80,0.2)' : 'rgba(10,106,29,0.12)',
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.green,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.greenText }}>
              {t('licenseActive')}
            </Text>
            {licenseInfo.expiresAt && (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {t('licenseExpiresOn')} {formatDate(licenseInfo.expiresAt)}
              </Text>
            )}
            {licenseInfo.activationsRemaining != null && (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {licenseInfo.activationsRemaining} {licenseInfo.activationsRemaining === 1 ? t('deviceUsedSingular') : t('devicesUsed')}
              </Text>
            )}
          </View>
        </View>

        {/* License key (masked) */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' }}>
            {licenseInfo.key.slice(0, 8)}••••••••
          </Text>
          <TouchableOpacity onPress={refreshLicense}>
            <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Deactivate */}
        <TouchableOpacity
          onPress={handleDeactivate}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#E74C3C', fontWeight: '600' }}>
            {t('deactivate')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No license — activation input only
  return (
    <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: 16,
            paddingLeft: 16,
            paddingRight: 4,
            alignItems: 'center',
            borderWidth: error ? 1.5 : 0,
            borderColor: error ? '#E74C3C' : 'transparent',
          }}
        >
          <TextInput
            value={licenseKey}
            onChangeText={(text) => {
              setLicenseKey(text);
              setError('');
            }}
            placeholder={t('licenseKeyPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              flex: 1,
              fontSize: 15,
              color: colors.text,
              paddingVertical: 14,
              fontFamily: 'monospace',
            }}
          />
          <TouchableOpacity
            onPress={handleActivate}
            disabled={loading || !licenseKey.trim()}
            style={{
              backgroundColor: licenseKey.trim() && !loading ? colors.accent : 'transparent',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginVertical: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: licenseKey.trim() ? '#FFFFFF' : colors.textMuted,
                }}
              >
                {t('activate')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? (
          <Text style={{ fontSize: 13, color: '#E74C3C', paddingHorizontal: 4, lineHeight: 18 }}>
            {error}
          </Text>
        ) : null}
    </View>
  );
}
