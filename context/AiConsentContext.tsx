import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { setAiConsentHandler } from '@/utils/aiConsentBridge';

/* Consentement IA global (Apple 5.1.1(i)/5.1.2(i)). ensureConsent() résout
 * immédiatement à true si déjà accordé, sinon affiche une feuille de
 * consentement et résout quand l'utilisateur accepte (ou false s'il annule).
 * Le handler est aussi branché sur le client API (aiConsentBridge) pour couvrir
 * tous les points d'entrée IA (chat, recherche IA, plan de repas, TchopAI Live). */

type AiConsentContextType = { ensureConsent: () => Promise<boolean> };

const AiConsentContext = createContext<AiConsentContextType>({ ensureConsent: async () => false });

export function AiConsentProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateAiConsent } = useSettings();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const consentRef = useRef(settings.aiConsent);
  consentRef.current = settings.aiConsent;

  const ensureConsent = useCallback((): Promise<boolean> => {
    if (consentRef.current) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setVisible(true);
    });
  }, []);

  // Branche le handler impératif utilisé par le client API (non-React).
  useEffect(() => {
    setAiConsentHandler(ensureConsent);
    return () => setAiConsentHandler(null);
  }, [ensureConsent]);

  const finish = useCallback(
    (agreed: boolean) => {
      if (agreed) updateAiConsent(true);
      setVisible(false);
      resolverRef.current?.(agreed);
      resolverRef.current = null;
    },
    [updateAiConsent],
  );

  const dataItems = t('aiConsentData').split('\n').filter(Boolean);

  return (
    <AiConsentContext.Provider value={{ ensureConsent }}>
      {children}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => finish(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' }}>
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
              <View style={{ alignItems: 'center', marginBottom: 4 }}>
                <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={28} color={colors.accent} />
                </View>
                <Text style={{ marginTop: 12, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t('aiConsentTitle')}</Text>
              </View>

              <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>{t('aiConsentBody')}</Text>

              <View style={{ marginTop: 14, gap: 10 }}>
                {dataItems.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Ionicons name="arrow-forward-circle" size={18} color={colors.accent} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '600' }}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ marginTop: 16, fontSize: 13, lineHeight: 20, color: colors.textMuted }}>{t('aiConsentProvider')}</Text>

              <TouchableOpacity
                onPress={() => WebBrowser.openBrowserAsync(`https://tchope.lndev.me/${settings.language}/privacy`)}
                style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                <Ionicons name="document-text-outline" size={15} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' }}>{t('aiConsentPrivacy')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => finish(true)}
                style={{ marginTop: 24, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{t('aiConsentAgree')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => finish(false)} style={{ marginTop: 10, alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>{settings.language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AiConsentContext.Provider>
  );
}

export function useAiConsent() {
  return useContext(AiConsentContext);
}
