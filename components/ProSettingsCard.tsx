// Bloc « Tchopé Pro » des Réglages : état, découvrir l'abonnement, restaurer, gérer (réglages du store), et en
// développement « Simuler Pro ».
import React from 'react';
import { Alert, Linking, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/context/SettingsContext';
import { usePro } from '@/context/ProContext';
import { proDict } from '@/constants/pro-translations';
import { MANAGE_URL, showManageSubscriptions } from '@/lib/pro';

export default function ProSettingsCard() {
  const { colors, isDark } = useTheme();
  const { settings } = useSettings();
  const d = proDict[settings.language === 'en' ? 'en' : 'fr'];
  const { pro, managementURL, openPaywall, restorePurchases, devPro, setDevPro } = usePro();
  const [busy, setBusy] = React.useState(false);

  const manage = async () => {
    if (await showManageSubscriptions()) return;
    Linking.openURL(managementURL ?? MANAGE_URL).catch(() => {});
  };
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await restorePurchases();
      Alert.alert('Tchopé Pro', r === true ? d.restored : r === false ? d.restoreNone : d.unavailable);
    } finally {
      setBusy(false);
    }
  };

  const row = (label: string, onPress: () => void, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity onPress={onPress} disabled={busy} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.accent }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.4, paddingHorizontal: 8 }}>{d.block}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 20, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(245,158,66,0.15)' : 'rgba(145,71,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={pro ? 'star' : 'star-outline'} size={20} color={colors.accent} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.text }}>{pro ? d.active : d.inactive}</Text>
        </View>
        {pro ? row(d.manage, manage, 'card-outline') : row(d.see, () => openPaywall('settings'), 'sparkles-outline')}
        {row(d.restore, restore, 'refresh-outline')}
        {__DEV__ ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{d.devToggle}</Text>
            <Switch value={devPro} onValueChange={setDevPro} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
