import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  ActivityIndicator,
  Keyboard,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLicense } from '@/context/LicenseContext';
import { useImageQuota } from '@/hooks/useImageQuota';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { REWARDED_MESSAGES_PER_AD, REWARDED_FAILOPEN_DELAY_MS } from '@/constants/ads';
import { loadAiCredits, saveAiCredits } from '@/utils/aiCredits';
import { canWatchRewarded, recordRewardedView } from '@/utils/adQuota';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { useUserRecipes } from '@/context/UserRecipesContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useMealPlanner } from '@/context/MealPlannerContext';
import { useNotes } from '@/context/NotesContext';
import { callClaude, callClaudeLive, fetchRecipeUrl } from '@/utils/api';
import { getChatHistory, saveChat, deleteChat, clearAllChats, MAX_SAVED_CHATS, type SavedChat } from '@/utils/chatHistory';
import TchopePlusScreen from '@/components/premium/TchopePlusScreen';

import type { Message } from '@/components/tchop-ai/types';
import { parseResponse, buildSystemPrompt } from '@/components/tchop-ai/utils';
import ChatHeader from '@/components/tchop-ai/ChatHeader';
import ChatMessage from '@/components/tchop-ai/ChatMessage';
import ChatInput from '@/components/tchop-ai/ChatInput';

export default function TchopAIScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings, updateAiConsent } = useSettings();
  const isConnected = useNetworkStatus();
  const recipes = useLocalizedRecipes();
  const { addRecipe, userRecipes } = useUserRecipes();
  const { favorites } = useFavorites();
  const { currentPlan } = useMealPlanner();
  const { notes, addNote } = useNotes();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { isPremium } = useLicense();
  const imageQuota = useImageQuota();

  const isFr = settings.language === 'fr';

  // --- State ---
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant', content: t('tchopaiWelcome'),
  }]);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [credits, setCredits] = useState(0);
  const rewardedAd = useRewardedAd();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState<SavedChat[]>([]);
  const chatIdRef = useRef<string>(Date.now().toString());
  const flatListRef = useRef<FlatList>(null);

  // Portail rewarded « 1 pub = N messages » (modèle Travora) : le crédit se
  // recharge à volonté en regardant une pub, dans la limite du plafond de
  // sécurité quotidien partagé (utils/adQuota.ts).
  const locked = !isPremium && credits <= 0;
  const [adsCapped, setAdsCapped] = useState(false);
  useEffect(() => {
    if (locked) canWatchRewarded().then((ok) => setAdsCapped(!ok));
  }, [locked]);

  const grantCredits = useCallback((amount: number) => {
    setCredits((c) => {
      const n = c + amount;
      saveAiCredits(n);
      return n;
    });
  }, []);

  const handleWatchRewarded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rewardedAd.show(() => {
      recordRewardedView();
      grantCredits(REWARDED_MESSAGES_PER_AD);
    });
  };

  // --- Keyboard handling ---
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height - (Platform.OS === 'ios' ? bottom : 0),
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 200) : 200,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [bottom, keyboardPadding]);

  // --- Message credits (persistent balance) ---
  useEffect(() => {
    loadAiCredits().then(setCredits);
  }, []);

  // --- Auto-save chat ---
  useEffect(() => {
    const realMessages = messages.filter((m) => m.id !== 'welcome');
    if (realMessages.length === 0) return;
    const firstUserMsg = realMessages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : 'Chat';
    saveChat({
      id: chatIdRef.current,
      title,
      messages: messages.filter((m) => m.id !== 'welcome').map((m) => ({ id: m.id, role: m.role, content: m.content })),
      createdAt: chatIdRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [messages]);

  // --- Build prompt ---
  const getSystemPrompt = useCallback(() => {
    return buildSystemPrompt(recipes, userRecipes, favorites, currentPlan, isFr, notes);
  }, [recipes, userRecipes, favorites, currentPlan, isFr, notes]);

  // --- Send message ---
  const handleSend = async () => {
    const text = input.trim();
    // Garde-fou : aucun envoi vers l'IA tant que le consentement n'est pas donné.
    if (!text || loading || locked || !settings.aiConsent) return;
    Keyboard.dismiss();

    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: t('tchopaiOffline') }]);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setLoadingMessage(isFr ? 'TchopAI réfléchit...' : 'TchopAI is thinking...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      let enrichedText = text;
      const urlMatch = text.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        setLoadingMessage(isFr ? 'Analyse du lien en cours...' : 'Analyzing link...');
        const urlContent = await fetchRecipeUrl(urlMatch[0]);
        if (urlContent) enrichedText = `${text}\n\n[Contenu extrait du lien :\n${urlContent}]`;
        setLoadingMessage(isFr ? 'Préparation de la réponse...' : 'Preparing response...');
      }

      const enrichedMsg = { ...userMsg, content: enrichedText };
      const history = [...messages.filter((m) => m.id !== 'welcome' && m.role !== 'info'), enrichedMsg].map((m) => ({
        role: m.role, content: m.content,
      }));

      const response = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: [{ type: 'text', text: getSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: history,
      });

      const parsed = parseResponse(response, recipes, notes);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: parsed.content, recipeIds: parsed.recipeIds, saveRecipe: parsed.saveRecipe, noteIds: parsed.noteIds, saveNote: parsed.saveNote,
      }]);

      // Réponse reçue → consomme 1 crédit (jamais décompté sur erreur).
      if (!isPremium) {
        setCredits((c) => {
          const n = Math.max(0, c - 1);
          saveAiCredits(n);
          return n;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: t('tchopaiError') }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // --- Chat management ---
  const handleNewChat = () => {
    chatIdRef.current = Date.now().toString();
    setMessages([{ id: 'welcome', role: 'assistant', content: t('tchopaiWelcome') }]);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenHistory = async () => {
    setChatHistoryList(await getChatHistory());
    setShowHistoryModal(true);
  };

  const handleLoadChat = (chat: SavedChat) => {
    chatIdRef.current = chat.id;
    setMessages([{ id: 'welcome', role: 'assistant', content: t('tchopaiWelcome') }, ...chat.messages]);
    setShowHistoryModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    setChatHistoryList((prev) => prev.filter((c) => c.id !== chatId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearAllHistory = () => {
    Alert.alert(t('deleteAllHistoryConfirm'), t('deleteAllHistoryDesc'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        await clearAllChats();
        setChatHistoryList([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  };

  // --- Photo ---
  const handlePhotoPress = () => {
    if (!isPremium) { setShowPhotoModal(true); return; }
    setShowSourceModal(true);
  };

  const pickAndSendPhoto = async (source: 'camera' | 'gallery') => {
    setShowSourceModal(false);
    try {
      if (!imageQuota.canSend) {
        Alert.alert(isFr ? 'Limite atteinte' : 'Limit reached', t('imageQuotaReached'));
        return;
      }

      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      }
      if (result.canceled || !result.assets[0]?.base64) return;

      await imageQuota.increment();
      const remaining = imageQuota.remaining - 1;
      const base64Data = result.assets[0].base64;
      const quotaInfo = remaining <= 0
        ? `📷 0/${imageQuota.limit} — ${t('imageQuotaReached')}`
        : `📷 ${remaining}/${imageQuota.limit} ${t('imageQuota')}`;
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: isFr ? '📷 Photo envoyée' : '📷 Photo sent' };
      const quotaMsg: Message = { id: `quota-${Date.now()}`, role: 'info', content: quotaInfo };
      setMessages((prev) => [...prev, userMsg, quotaMsg]);
      setLoading(true);
      setLoadingMessage(isFr ? 'Analyse de la photo...' : 'Analyzing photo...');

      const history = [...messages.filter((m) => m.id !== 'welcome' && m.role !== 'info'), userMsg].map((m) => ({
        role: m.role, content: m.content,
      }));

      const messagesWithImage = [
        ...history.slice(0, -1),
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: isFr ? 'Analyse cette photo et dis-moi ce que tu en penses pour la cuisine camerounaise.' : 'Analyze this photo and tell me what you think for Cameroonian cooking.' },
            { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg', data: base64Data } },
          ],
        },
      ];

      const response = await callClaudeLive({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [{ type: 'text', text: getSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: messagesWithImage,
      });

      const parsed = parseResponse(response, recipes, notes);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: parsed.content, recipeIds: parsed.recipeIds, saveRecipe: parsed.saveRecipe, noteIds: parsed.noteIds, saveNote: parsed.saveNote,
      }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: t('tchopaiError') }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // --- Render ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {!settings.aiConsent ? (
      <AiConsent
        colors={colors}
        isDark={isDark}
        t={t}
        locale={settings.language}
        onAgree={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateAiConsent(true); }}
        onBack={() => router.back()}
      />
      ) : (
      <Animated.View style={{ flex: 1, marginBottom: keyboardPadding }}>
        <ChatHeader
          colors={colors}
          isDark={isDark}
          messageCount={messages.length}
          onBack={() => router.back()}
          onNewChat={handleNewChat}
          onOpenHistory={handleOpenHistory}
          t={t}
        />

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <ChatMessage
              item={item}
              colors={colors}
              isDark={isDark}
              isFr={isFr}
              recipes={recipes}
              userRecipes={userRecipes}
              notes={notes}
              copiedId={copiedId}
              setCopiedId={setCopiedId}
              onRecipePress={(id) => router.push(`/recipe/${id}`)}
              onNotePress={(id) => router.push(`/note/${id}` as any)}
              onSaveRecipe={addRecipe}
              onSaveNote={addNote}
              t={t}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
        />

        {loading && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: isDark ? '#2A2A2A' : '#F3F0EF',
              borderRadius: 20, borderBottomLeftRadius: 6,
              paddingHorizontal: 16, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>
                {loadingMessage || (isFr ? 'TchopAI réfléchit...' : 'TchopAI is thinking...')}
              </Text>
            </View>
          </View>
        )}

        {locked ? (
          <AdGate
            colors={colors}
            ready={rewardedAd.ready}
            capped={adsCapped}
            onWatch={handleWatchRewarded}
            onContinue={() => grantCredits(1)}
            onUpgrade={() => setShowPlusModal(true)}
            t={t}
          />
        ) : (
          <>
            <ChatInput
              input={input}
              setInput={setInput}
              loading={loading}
              canSend={!locked}
              canPhoto={imageQuota.canSend}
              colors={colors}
              onSend={handleSend}
              onPhoto={handlePhotoPress}
              t={t}
            />
            {!isPremium && (
              <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, paddingBottom: 6 }}>
                {t('aiMessagesLeft').replace('{count}', String(credits))}
              </Text>
            )}
          </>
        )}
      </Animated.View>
      )}

      {/* TchopePlus modal */}
      <Modal visible={showPlusModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPlusModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TchopePlusScreen onClose={() => setShowPlusModal(false)} />
        </View>
      </Modal>

      {/* Photo source picker */}
      <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: bottom + 16 }}>
          <View style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => pickAndSendPhoto('camera')}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>{isFr ? 'Prendre une photo' : 'Take a photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickAndSendPhoto('gallery')}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              <Ionicons name="images-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>{isFr ? 'Choisir dans la galerie' : 'Choose from gallery'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowSourceModal(false)}
            style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', borderRadius: 20, paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>{isFr ? 'Annuler' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Photo premium modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', borderRadius: 24, padding: 24, gap: 16, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={28} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{t('premiumRequired')}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {isFr ? "L'envoi de photos à TchopAI est réservé aux abonnés Tchopé Plus." : 'Sending photos to TchopAI is available for Tchopé Plus subscribers.'}
            </Text>
            <TouchableOpacity
              onPress={() => { setShowPhotoModal(false); setShowPlusModal(true); }}
              style={{ backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{t('upgradeToPremium')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{isFr ? 'Annuler' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chat history modal */}
      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 }}>{t('chatHistory')}</Text>
              {chatHistoryList.length > 0 && (
                <TouchableOpacity onPress={handleClearAllHistory}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#E74C3C' }}>{t('deleteAllHistory')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                {t('chatHistoryLimit').replace('{count}', String(MAX_SAVED_CHATS))}
              </Text>
            </View>
            {chatHistoryList.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={{ fontSize: 15, color: colors.textMuted }}>{t('chatHistoryEmpty')}</Text>
              </View>
            ) : (
              <FlatList
                data={chatHistoryList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 8 }}
                renderItem={({ item }) => {
                  const date = new Date(item.updatedAt);
                  const now = new Date();
                  const isToday = date.toDateString() === now.toDateString();
                  const yesterday = new Date(now);
                  yesterday.setDate(yesterday.getDate() - 1);
                  const isYesterday = date.toDateString() === yesterday.toDateString();
                  const dateStr = isToday ? t('today') : isYesterday ? t('yesterday') : date.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
                  const timeStr = date.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                  const msgCount = item.messages.filter((m) => m.role !== 'info').length;

                  return (
                    <TouchableOpacity
                      onPress={() => handleLoadChat(item)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                        borderRadius: 16, padding: 14,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        borderWidth: 1, borderColor: isDark ? '#3A3A3A' : '#E8E5E4',
                      }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="chatbubble-outline" size={18} color="#A855F7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{dateStr} · {timeStr} · {msgCount} msg</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteChat(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Portail rewarded « regarde une pub = N messages » (modèle Travora) —
 *  remplace la zone de saisie quand le crédit est à 0, rechargeable à volonté.
 *  FAIL-OPEN : si la pub n'a pas chargé après REWARDED_FAILOPEN_DELAY_MS
 *  (pas de remplissage, panne AdMob…), « Continuer sans pub » offre 1 message
 *  — la régie ne doit jamais bloquer TchopAI. `capped` = plafond quotidien de
 *  pubs atteint (utils/adQuota.ts) → seul l'abonnement est proposé. */
function AdGate({ colors, ready, capped, onWatch, onContinue, onUpgrade, t }: {
  colors: any;
  ready: boolean;
  capped: boolean;
  onWatch: () => void;
  onContinue: () => void;
  onUpgrade: () => void;
  t: (k: any) => string;
}) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), REWARDED_FAILOPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  const showFailOpen = !capped && elapsed && !ready;
  const count = String(REWARDED_MESSAGES_PER_AD);

  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
        {t('aiUnlockTitle')}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
        {capped ? t('adDailyLimitReached') : t('aiUnlockText').replace('{count}', count)}
      </Text>
      {!capped && (
        <TouchableOpacity
          onPress={onWatch}
          disabled={!ready}
          style={{ backgroundColor: ready ? colors.accent : colors.surface, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' }}>
          {ready ? (
            <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
          ) : (
            <ActivityIndicator size="small" color={colors.textMuted} />
          )}
          <Text style={{ fontSize: 15, fontWeight: '700', color: ready ? '#FFFFFF' : colors.textMuted }}>
            {ready
              ? t('watchAdForMessage')
                  .replace('{count}', count)
                  .replace('{plural}', REWARDED_MESSAGES_PER_AD > 1 ? 's' : '')
              : t('aiAdLoading')}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onUpgrade}
        style={{ borderWidth: 1.5, borderColor: colors.accent, borderRadius: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' }}>
        <Ionicons name="sparkles" size={16} color={colors.accent} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{t('upgradeToPremium')}</Text>
      </TouchableOpacity>
      {showFailOpen && (
        <TouchableOpacity onPress={onContinue} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' }}>
            {t('aiContinueNoAd')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Écran de consentement (Apple 5.1.1(i)/5.1.2(i)) : divulgue les données
 *  envoyées à TchopAI + le prestataire IA (Anthropic) et recueille un accord
 *  explicite AVANT tout envoi. Affiché tant que settings.aiConsent est faux ;
 *  « J'accepte » le persiste et ne réapparaît plus. */
function AiConsent({ colors, isDark, t, locale, onAgree, onBack }: {
  colors: any;
  isDark: boolean;
  t: (k: any) => string;
  locale: string;
  onAgree: () => void;
  onBack: () => void;
}) {
  const dataItems = t('aiConsentData').split('\n').filter(Boolean);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>TchopAI</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-checkmark-outline" size={30} color={colors.accent} />
          </View>
          <Text style={{ marginTop: 14, fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t('aiConsentTitle')}</Text>
        </View>

        <Text style={{ marginTop: 14, fontSize: 14, lineHeight: 21, color: colors.textSecondary }}>{t('aiConsentBody')}</Text>

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
          onPress={() => WebBrowser.openBrowserAsync(`https://tchope.lndev.me/${locale}/privacy`)}
          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <Ionicons name="document-text-outline" size={15} color={colors.accent} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textDecorationLine: 'underline' }}>{t('aiConsentPrivacy')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAgree}
          style={{ marginTop: 24, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{t('aiConsentAgree')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
