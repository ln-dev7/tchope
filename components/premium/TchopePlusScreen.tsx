import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLicense } from '@/context/LicenseContext';
import { useToast } from '@/hooks/useToast';
import { getLicenseErrorMessage } from '@/services/license/errors';
import { CHARIOW_URL_MONTHLY, CHARIOW_URL_ANNUAL } from '@/constants/translations';

const FEATURES = [
  { icon: 'chatbubble-ellipses', key: 'featureTchopAI', descKey: 'featureTchopAIDesc' },
  { icon: 'mic', key: 'featureTchopAILive', descKey: 'featureTchopAILiveDesc' },
  { icon: 'search', key: 'featureAISearch', descKey: 'featureAISearchDesc' },
  { icon: 'calendar', key: 'featureAIMealPlan', descKey: 'featureAIMealPlanDesc' },
  { icon: 'options', key: 'featureAIAdjust', descKey: 'featureAIAdjustDesc' },
] as const;

type Plan = 'monthly' | 'annual';
type Screen = 'info' | 'activate';

export default function TchopePlusScreen({ onClose }: { onClose?: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { activateLicense } = useLicense();
  const { toast } = useToast();
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');
  const [screen, setScreen] = useState<Screen>('info');
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

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
      router.replace('/(tabs)' as any);
      return;
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getLicenseErrorMessage(result.status, t));
    }
  };

  const handleBuy = () => {
    const url = selectedPlan === 'annual' ? CHARIOW_URL_ANNUAL : CHARIOW_URL_MONTHLY;
    Linking.openURL(url);
    setScreen('activate');
  };

  const toggleFeature = (key: string) => {
    setExpandedFeature(expandedFeature === key ? null : key);
  };

  // ── Expandable features list component ──
  const featuresBlock = (
    <View style={{ marginTop: 24, gap: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, paddingHorizontal: 4 }}>
        {t('premiumFeatures')}
      </Text>
      <View
        style={{
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: isDark ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        {FEATURES.map((f, i) => {
          const isExpanded = expandedFeature === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => toggleFeature(f.key)}
              activeOpacity={0.7}
              style={{
                padding: 16,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: isDark ? colors.border : '#F0EDEC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: isDark ? `${colors.accent}15` : `${colors.accent}08`,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name={f.icon as any} size={16} color={colors.accent} />
                </View>
                <Text style={{ fontSize: 14, color: colors.text, flex: 1, fontWeight: '500' }}>
                  {t(f.key as any)}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </View>
              {isExpanded && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10, marginLeft: 44, lineHeight: 19 }}>
                  {t(f.descKey as any)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL('https://t.me/ln_dev7')}
        style={{ marginTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
      >
        <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {t('plusContact')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Activation screen ──
  if (screen === 'activate') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close → goes back to info screen */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => setScreen('info')}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="key-outline" size={32} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              {t('activateLicense')}
            </Text>
          </View>

          {/* License input */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              paddingLeft: 16,
              paddingRight: 4,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: error ? 1.5 : 0,
              borderColor: error ? '#E74C3C' : 'transparent',
            }}
          >
            <TextInput
              value={licenseKey}
              onChangeText={(text) => { setLicenseKey(text); setError(''); }}
              placeholder={t('licenseKeyPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 16, fontFamily: 'monospace' }}
            />
          </View>
          {error ? (
            <Text style={{ fontSize: 13, color: '#E74C3C', marginTop: 8, lineHeight: 18 }}>{error}</Text>
          ) : null}

          {/* Activate button */}
          <TouchableOpacity
            onPress={handleActivate}
            disabled={loading || !licenseKey.trim()}
            activeOpacity={0.85}
            style={{
              marginTop: 16,
              backgroundColor: licenseKey.trim() && !loading ? colors.accent : colors.surface,
              borderRadius: 20,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={licenseKey.trim() ? '#FFFFFF' : colors.textMuted} />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '700', color: licenseKey.trim() ? '#FFFFFF' : colors.textMuted }}>
                {t('activate')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to info */}
          <TouchableOpacity onPress={() => setScreen('info')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>{t('noLicense')}</Text>
          </TouchableOpacity>

          {/* Features at bottom */}
          {featuresBlock}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Info screen (default) ──
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Close button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={handleClose}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Icon + Title */}
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={36} color={colors.accent} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5, marginTop: 16 }}>
          {t('upgradeToPremium')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          {t('premiumRequiredDescription')}
        </Text>
      </View>

      {/* Plan selector */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => setSelectedPlan('monthly')}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 16, padding: 16, borderWidth: 2,
            borderColor: selectedPlan === 'monthly' ? colors.accent : isDark ? colors.border : '#E0DDDD',
            backgroundColor: selectedPlan === 'monthly' ? (isDark ? `${colors.accent}15` : `${colors.accent}06`) : (isDark ? colors.surface : '#FFFFFF'),
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: selectedPlan === 'monthly' ? colors.accent : colors.text }}>
            {t('monthlyPlan')}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: selectedPlan === 'monthly' ? colors.accent : colors.text, marginTop: 6 }}>
            {t('monthlyPrice')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedPlan('annual')}
          activeOpacity={0.8}
          style={{
            flex: 1, borderRadius: 16, padding: 16, borderWidth: 2,
            borderColor: selectedPlan === 'annual' ? colors.accent : isDark ? colors.border : '#E0DDDD',
            backgroundColor: selectedPlan === 'annual' ? (isDark ? `${colors.accent}15` : `${colors.accent}06`) : (isDark ? colors.surface : '#FFFFFF'),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: selectedPlan === 'annual' ? colors.accent : colors.text }}>
              {t('annualPlan')}
            </Text>
            <View style={{ backgroundColor: colors.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>{t('annualSaving')}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: selectedPlan === 'annual' ? colors.accent : colors.text, marginTop: 6 }}>
            {t('annualPrice')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>
        {t('featureDeviceLimit')}
      </Text>

      {/* Buy button */}
      <TouchableOpacity
        onPress={handleBuy}
        activeOpacity={0.85}
        style={{
          marginTop: 16, backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{t('buyLicense')}</Text>
      </TouchableOpacity>

      {/* Already have a license */}
      <TouchableOpacity onPress={() => setScreen('activate')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>{t('alreadyHaveLicense')}</Text>
      </TouchableOpacity>

      {/* Features at bottom */}
      {featuresBlock}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
