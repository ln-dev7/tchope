import { fixedColors } from "@/constants/themes";
import { AdaptiveModal } from '@/components/AdaptiveModal';
// Écran d'abonnement Tchopé Pro (lib/pro.ts, context/ProContext.tsx), porté de Travora Pro. Monté une fois dans
// app/_layout.tsx, et sur place (`local`) dans les écrans en plein écran modal (cuisson, Live), car iOS ne présente pas
// une modale de la racine par-dessus. S'ouvre par `openPaywall()` ou automatiquement quand une fonction IA est demandée
// sans abonnement (utils/proBridge.ts).
// Le prix affiché est TOUJOURS celui du store (App Store Review 3.1.2) : tant qu'il n'est pas chargé, aucun prix.
import React from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSettings } from '@/context/SettingsContext';
import { usePro } from '@/context/ProContext';
import { proDict, fill } from '@/constants/pro-translations';
import { FREE_CHAT_MESSAGES } from '@/lib/pro';
import type { PaywallReason } from '@/utils/proBridge';

const ICONS: (keyof typeof Ionicons.glyphMap)[] = ['sparkles-outline', 'camera-outline', 'search-outline', 'calendar-outline', 'mic-outline', "color-palette-outline"];
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function Paywall({ local = false }: { local?: boolean }) {
  const { paywall, localHosts, registerLocalHost } = usePro();
  React.useEffect(() => (local ? registerLocalHost() : undefined), [local, registerLocalHost]);
  // La racine laisse la place à un écran local monté (plein écran modal).
  if (!paywall || (!local && localHosts > 0)) return null;
  return <PaywallSheet key={paywall} reason={paywall} />;
}

function PaywallSheet({ reason }: { reason: PaywallReason }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const lang = settings.language === 'en' ? 'en' : 'fr';
  const d = proDict[lang];
  const { closePaywall, configured, offer, buy, restorePurchases, pro } = usePro();
  const [busy, setBusy] = React.useState<'buy' | 'restore' | null>(null);
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

  // Abonnement devenu actif (achat, restauration, mise à jour du SDK) : le message reste lisible puis on ferme.
  React.useEffect(() => {
    if (!pro) return;
    const t = setTimeout(closePaywall, msg?.ok ? 1200 : 0);
    return () => clearTimeout(t);
  }, [pro, msg, closePaywall]);

  const price = offer?.price ?? null;
  const perks = d.perks.split('\n').filter(Boolean);
  const why = reason === 'chat' ? fill(d.reasonChat, { n: FREE_CHAT_MESSAGES }) : reason === 'feature' ? d.reasonFeature : null;
  const close = () => {
    if (!busy) closePaywall();
  };

  const onBuy = async () => {
    if (busy) return;
    if (!configured || !price) {
      setMsg({ text: d.unavailable, ok: false });
      return;
    }
    setBusy('buy');
    setMsg(null);
    try {
      const r = await buy();
      if (r === 'pending') setMsg({ text: d.pending, ok: true });
      else if (r === 'already') setMsg({ text: d.alreadyOwned, ok: true });
      else if (r === 'failed') setMsg({ text: d.failed, ok: false });
    } finally {
      setBusy(null);
    }
  };
  const onRestore = async () => {
    if (busy) return;
    if (!configured) {
      setMsg({ text: d.unavailable, ok: false });
      return;
    }
    setBusy('restore');
    setMsg(null);
    try {
      const r = await restorePurchases();
      if (r === true) setMsg({ text: d.restored, ok: true });
      else if (r === false) setMsg({ text: d.restoreNone, ok: false });
      else setMsg({ text: d.unavailable, ok: false });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdaptiveModal visible onClose={close} dismissOnBackdrop={false} animationType="slide" padding={24}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="star" size={26} color={colors.onAccent} />
              </View>
              <Pressable
                onPress={close}
                disabled={!!busy}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={d.later}
                style={{ width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: busy ? 0.4 : 1 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={{ marginTop: 14, fontSize: 30, fontWeight: '800', color: colors.text }}>{d.title}</Text>
            <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, color: colors.textSecondary }}>{d.subtitle}</Text>
            {why ? <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>{why}</Text> : null}

            <View style={{ marginTop: 18, gap: 12 }}>
              {perks.map((line, i) => {
                const m = line.match(/^(.*?)\s?:\s(.*)$/);
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                    <Ionicons name={ICONS[i % ICONS.length]} size={20} color={colors.accent} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary }}>
                      {m ? <Text style={{ fontWeight: '800', color: colors.text }}>{m[1]} : </Text> : null}
                      {m ? m[2] : line}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={{ marginTop: 20, borderRadius: 16, padding: 14, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accent }}>{price ? fill(d.priceLine, { price }) : d.priceLoading}</Text>
              <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{d.renewal}</Text>
            </View>

            {msg ? <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: msg.ok ? colors.green : fixedColors.purchaseFailure }}>{msg.text}</Text> : null}

            <Pressable
              onPress={onBuy}
              disabled={!!busy || (configured && !price)}
              accessibilityRole="button"
              style={{ marginTop: 16, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: busy || (configured && !price) ? 0.6 : 1 }}
            >
              {busy === 'buy' ? <ActivityIndicator color={colors.onAccent} /> : <Ionicons name="lock-open-outline" size={18} color={colors.onAccent} />}
              <Text style={{ color: colors.onAccent, fontWeight: '800', fontSize: 16 }}>{busy === 'buy' ? d.buying : price ? fill(d.buy, { price }) : d.buyNoPrice}</Text>
            </Pressable>
            <Pressable onPress={onRestore} disabled={!!busy} accessibilityRole="button" style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }}>
              {busy === 'restore' ? <ActivityIndicator color={colors.accent} /> : <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{d.restore}</Text>}
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 4 }}>
              {Platform.OS === 'ios' ? (
                <Pressable onPress={() => Linking.openURL(APPLE_EULA)} accessibilityRole="link">
                  <Text style={{ fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' }}>{d.terms}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => Linking.openURL(`https://tchope.lndev.me/${lang}/privacy`)} accessibilityRole="link">
                <Text style={{ fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' }}>{d.privacy}</Text>
              </Pressable>
            </View>
    </AdaptiveModal>
  );
}
