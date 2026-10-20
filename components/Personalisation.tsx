import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { usePersonalisation } from '@/hooks/usePersonalisation';
import { useSettings } from '@/context/SettingsContext';
import { proDict } from '@/constants/pro-translations';
import { APP_ICONS } from '@/constants/app-icons';
import { DEFAULT_PALETTE, PALETTE_IDS, resolveColors, type ThemeColors } from '@/constants/themes';

function ui(c: ThemeColors) { return { bg: c.background, card: c.card, ink: c.text, muted: c.textSecondary, border: c.border, accent: c.accent, soft: c.accentSoft, on: c.onAccent }; }

export function PersonalisationLink() {
  const router = useRouter();
  const { colors } = useTheme(); const c = ui(colors);
  const { settings } = useSettings(); const d = proDict[settings.language].personalisation;
  return <Pressable accessibilityRole="button" onPress={() => router.push('/personalisation')}
    style={{ marginVertical: 14, padding: 18, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
    <Ionicons name="color-palette-outline" size={25} color={c.accent} />
    <View style={{ flex: 1 }}><Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{d.title}</Text><Text style={{ color: c.muted, fontSize: 13, marginTop: 4 }}>{d.icons} · {d.themes}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={c.muted} />
  </Pressable>;
}

export default function PersonalisationScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme(); const c = ui(colors);
  const { settings, pro, ready, busy, chooseIcon, choosePalette, d } = usePersonalisation();
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'left', 'right', 'bottom']}>
    <ScrollView contentContainerStyle={{ padding: 24, width: '100%', maxWidth: 840, alignSelf: 'center', paddingBottom: 40 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={d.back} onPress={() => router.back()} style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 24 }}><Ionicons name="arrow-back" size={24} color={c.ink} /></Pressable>
      <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '700', color: c.ink }}>{d.title}</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: c.muted, marginTop: 10 }}>{d.subtitle}</Text>
      {!ready || busy ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}><ActivityIndicator color={c.accent} /><Text style={{ color: c.muted }}>{busy ? d.changing : d.loading}</Text></View> : null}
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700', marginTop: 30, marginBottom: 16 }}>{d.icons}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {APP_ICONS.map(icon => {
          const selected = settings.appIcon === icon.id;
          const lock = !pro && icon.id !== 'default' && !selected;
          return <Pressable key={icon.id} accessibilityRole="button" accessibilityLabel={d.iconsNames[icon.id] + (lock ? ', ' + d.locked : '')} accessibilityState={{ selected, disabled: !ready || busy }}
            disabled={!ready || busy} onPress={() => void chooseIcon(icon.id)}
            style={{ width: '30%', flexGrow: 1, maxWidth: 174, minHeight: 132, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: selected ? c.soft : c.card, borderWidth: 2, borderColor: selected ? c.accent : c.border, gap: 9 }}>
            <Image source={icon.image} style={{ width: 64, height: 64, borderRadius: 15 }} />
            <Text style={{ color: c.ink, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>{d.iconsNames[icon.id]}</Text>
            <Ionicons name={selected ? 'checkmark-circle' : lock ? 'lock-closed-outline' : 'ellipse-outline'} size={16} color={selected ? c.accent : c.muted} />
          </Pressable>;
        })}
      </View>
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 14 }}>{d.iconNote}</Text>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700', marginTop: 30, marginBottom: 16 }}>{d.themes}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {PALETTE_IDS.map(id => {
          const selected = settings.palette === id; const p = ui(resolveColors(id, isDark));
          const lock = !pro && id !== DEFAULT_PALETTE && !selected;
          return <Pressable key={id} accessibilityRole="button" accessibilityLabel={d.themeNames[id] + (lock ? ', ' + d.locked : '')} accessibilityState={{ selected, disabled: !ready || busy }} disabled={!ready || busy} onPress={() => void choosePalette(id)}
            style={{ width: '46%', flexGrow: 1, borderRadius: 18, borderWidth: 2, borderColor: selected ? c.accent : c.border, backgroundColor: c.card, padding: 14 }}>
            <View style={{ flexDirection: 'row', gap: 7, marginBottom: 12 }}>{[p.accent, p.soft, p.bg].map((color, i) => <View key={i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, borderWidth: 1, borderColor: p.border }} />)}</View>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 14 }}>{d.themeNames[id]}</Text>
            <View style={{ marginTop: 10, alignSelf: 'flex-end' }}><Ionicons name={selected ? 'checkmark-circle' : lock ? 'lock-closed-outline' : 'ellipse-outline'} size={18} color={selected ? c.accent : c.muted} /></View>
          </Pressable>;
        })}
      </View>
      <View accessibilityLabel={d.preview} style={{ borderRadius: 22, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, padding: 22, marginTop: 20 }}>
        <Text style={{ color: c.accent, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>{d.preview}</Text>
        <Text style={{ color: c.ink, fontSize: 23, fontWeight: '700' }}>{d.previewTitle}</Text>
        <Text style={{ color: c.muted, marginVertical: 10 }}>{d.previewText}</Text>
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 }}><Text style={{ color: c.on, fontWeight: '700' }}>{d.previewAction}</Text></View>
      </View>
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 16 }}>{d.systemNote}</Text>
      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 10 }}>{d.kept}</Text>
    </ScrollView>
  </SafeAreaView>;
}
