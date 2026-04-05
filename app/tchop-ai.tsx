import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  ActivityIndicator,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLicense } from '@/context/LicenseContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { callClaude, callClaudeLive } from '@/utils/api';
import * as ImagePicker from 'expo-image-picker';
import TchopePlusScreen from '@/components/premium/TchopePlusScreen';
import RecipeImage from '@/components/RecipeImage';
import type { Recipe } from '@/types';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recipeIds?: string[];
};

const SYSTEM_PROMPT_FR = `Tu es TchopAI, l'assistant culinaire intégré à l'application Tchopé — une app dédiée aux recettes camerounaises authentiques.

TON RÔLE :
- Répondre aux questions sur la cuisine camerounaise : recettes, ingrédients, techniques, traditions, régions, histoire culinaire
- Aider les utilisateurs avec les fonctionnalités de l'app : recherche de recettes, planification de repas, liste de courses, mode cuisine
- Donner des conseils et astuces de cuisine camerounaise
- Suggérer des substitutions d'ingrédients quand c'est pertinent
- Expliquer les plats par région (Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest)

TON STYLE :
- Chaleureux, passionné et accessible
- Utilise le tutoiement
- Réponds TOUJOURS en français, même si l'utilisateur écrit en anglais
- Sois concis mais informatif (2-3 paragraphes max)
- Utilise des emojis avec parcimonie pour rendre la conversation vivante
- N'utilise JAMAIS de formatage markdown (pas de **, pas de #, pas de -, pas de listes numérotées). Écris en texte brut uniquement, comme dans une conversation SMS

LIMITES STRICTES :
- Tu ne réponds QU'aux questions liées à la cuisine camerounaise, aux recettes, à la nourriture africaine en général, et aux fonctionnalités de l'app Tchopé
- Si on te pose une question hors sujet (politique, code, maths, etc.), réponds poliment que tu es spécialisé en cuisine camerounaise et redirige la conversation
- Ne génère JAMAIS de contenu inapproprié

RECETTES LIÉES (OBLIGATOIRE) :
Quand ta réponse mentionne, suggère ou recommande des recettes disponibles dans l'app, tu DOIS ajouter sur la DERNIÈRE ligne de ta réponse :
[RECIPES:id1,id2,id3]
Exemple : [RECIPES:ndole,eru,koki]
Règles :
- Utilise les IDs exacts entre crochets [] de la liste ci-dessous
- Pas d'espaces dans la liste des IDs
- Maximum 4 recettes
- TOUJOURS inclure cette ligne quand tu parles de recettes de l'app

RECETTES DISPONIBLES DANS L'APP :
{RECIPES}`;

const SYSTEM_PROMPT_EN = `You are TchopAI, the cooking assistant built into the Tchopé app — an app dedicated to authentic Cameroonian recipes.

YOUR ROLE:
- Answer questions about Cameroonian cuisine: recipes, ingredients, techniques, traditions, regions, culinary history
- Help users with app features: recipe search, meal planning, shopping list, cooking mode
- Give Cameroonian cooking tips and tricks
- Suggest ingredient substitutions when relevant
- Explain dishes by region (Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest)

YOUR STYLE:
- Warm, passionate and approachable
- ALWAYS respond in English, even if the user writes in French
- Be concise but informative (2-3 paragraphs max)
- Use emojis sparingly to keep the conversation lively
- NEVER use markdown formatting (no **, no #, no -, no numbered lists). Write in plain text only, like in an SMS conversation

STRICT LIMITS:
- ONLY answer questions related to Cameroonian cuisine, recipes, African food in general, and Tchopé app features
- If asked about off-topic subjects (politics, code, math, etc.), politely say you specialize in Cameroonian cooking and redirect the conversation
- NEVER generate inappropriate content

RELATED RECIPES (MANDATORY):
When your response mentions, suggests or recommends recipes available in the app, you MUST add on the LAST line of your response:
[RECIPES:id1,id2,id3]
Example: [RECIPES:ndole,eru,koki]
Rules:
- Use the exact IDs in brackets [] from the list below
- No spaces in the ID list
- Maximum 4 recipes
- ALWAYS include this line when you talk about recipes from the app

RECIPES AVAILABLE IN THE APP:
{RECIPES}`;

function MiniRecipeCard({ recipe, isDark, colors, onPress }: { recipe: Recipe; isDark: boolean; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
        borderRadius: 16,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: isDark ? '#3A3A3A' : '#E8E5E4',
      }}>
      <RecipeImage
        recipeId={recipe.id}
        category={recipe.category}
        imageUri={(recipe as any).imageUri}
        isDark={isDark}
        style={{ width: 48, height: 48 }}
        borderRadius={12}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {recipe.region} · {recipe.duration} min
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function TchopAIScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const isConnected = useNetworkStatus();
  const recipes = useLocalizedRecipes();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const offset = Platform.OS === 'ios' ? bottom : 0;
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height - offset,
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

  const { isPremium } = useLicense();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: t('tchopaiWelcome'),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isFr = settings.language === 'fr';
  const FREE_MESSAGE_LIMIT = 2;
  const freeMessagesLeft = FREE_MESSAGE_LIMIT - freeMessagesUsed;
  const canSendFree = isPremium || freeMessagesUsed < FREE_MESSAGE_LIMIT;

  // Load free message count
  useEffect(() => {
    AsyncStorage.getItem('tchope_free_messages').then((val) => {
      if (val) setFreeMessagesUsed(parseInt(val, 10));
    });
  }, []);

  const buildSystemPrompt = useCallback(() => {
    const recipeIndex = recipes
      .map((r) => `- [${r.id}] ${r.name} (${r.region}, ${r.category}, ${r.duration}min, ${r.difficulty}) : ${r.ingredients.map((i) => i.name).join(', ')}`)
      .join('\n');
    const template = isFr ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
    return template.replace('{RECIPES}', recipeIndex);
  }, [recipes, isFr]);

  function parseResponse(text: string): { content: string; recipeIds: string[] } {
    const match = text.match(/\[RECIPES:\s*([^\]]+)\]\s*$/);
    if (!match) return { content: text, recipeIds: [] };
    const content = text.slice(0, text.lastIndexOf('[RECIPES:')).trimEnd();
    const recipeIds = match[1]
      .split(',')
      .map((id) => id.trim())
      .filter((id) => recipes.some((r) => r.id === id));
    return { content, recipeIds };
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!canSendFree) return;
    Keyboard.dismiss();

    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('tchopaiOffline'),
      }]);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: history,
      });

      const parsed = parseResponse(response);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsed.content,
        recipeIds: parsed.recipeIds,
      }]);

      // Increment free message counter for non-premium users
      if (!isPremium) {
        const newCount = freeMessagesUsed + 1;
        setFreeMessagesUsed(newCount);
        AsyncStorage.setItem('tchope_free_messages', String(newCount));
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('tchopaiError'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: t('tchopaiWelcome'),
    }]);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePhotoPress = () => {
    if (!isPremium) {
      setShowPhotoModal(true);
      return;
    }
    pickAndSendPhoto();
  };

  const pickAndSendPhoto = async () => {
    try {
      let result: ImagePicker.ImagePickerResult;
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      }
      if (result.canceled || !result.assets[0]?.base64) return;

      const base64Data = result.assets[0].base64;
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: isFr ? '📷 Photo envoyée' : '📷 Photo sent' };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const history = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Replace last user message content with image block
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
        system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: messagesWithImage,
      });

      const parsed = parseResponse(response);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsed.content,
        recipeIds: parsed.recipeIds,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('tchopaiError'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const linkedRecipes = (item.recipeIds ?? [])
      .map((id) => recipes.find((r) => r.id === id))
      .filter(Boolean) as Recipe[];

    return (
      <View style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        marginBottom: 12,
      }}>
        <View style={{
          backgroundColor: isUser
            ? colors.accent
            : isDark ? '#2A2A2A' : '#F3F0EF',
          borderRadius: 20,
          borderBottomRightRadius: isUser ? 6 : 20,
          borderBottomLeftRadius: isUser ? 20 : 6,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <Text style={{
            fontSize: 15,
            lineHeight: 22,
            color: isUser ? '#FFFFFF' : colors.text,
          }}>
            {item.content}
          </Text>
        </View>
        {linkedRecipes.length > 0 && (
          <View style={{ gap: 6, marginTop: 8 }}>
            {linkedRecipes.map((recipe) => (
              <MiniRecipeCard
                key={recipe.id}
                recipe={recipe}
                isDark={isDark}
                colors={colors}
                onPress={() => router.push(`/recipe/${recipe.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const chatContent = (
    <>
      {/* Header */}
      <View style={{
        paddingBottom: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name="sparkles" size={18} color="#A855F7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
            {t('tchopaiTitle')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {t('tchopaiSubtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleReset}
          disabled={messages.length <= 1}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: messages.length <= 1 ? 0.4 : 1,
          }}>
          <Ionicons name="refresh" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardDismissMode="interactive"
      />

      {/* Typing indicator */}
      {loading && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{
            alignSelf: 'flex-start',
            backgroundColor: isDark ? '#2A2A2A' : '#F3F0EF',
            borderRadius: 20,
            borderBottomLeftRadius: 6,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        </View>
      )}

      {/* Input */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: 24,
          paddingLeft: 4,
          paddingRight: 4,
          alignItems: 'flex-end',
        }}>
          <TouchableOpacity
            onPress={handlePhotoPress}
            disabled={loading}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
              opacity: loading ? 0.4 : 1,
            }}>
            <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('tchopaiPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            style={{
              flex: 1,
              fontSize: 16,
              color: colors.text,
              paddingVertical: 12,
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading || !canSendFree}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() && !loading && canSendFree ? '#A855F7' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
            <Ionicons
              name="send"
              size={18}
              color={input.trim() && !loading && canSendFree ? '#FFFFFF' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <Animated.View style={{ flex: 1, marginBottom: keyboardPadding }}>
        {chatContent}

        {/* Free messages limit reached */}
        {!isPremium && !canSendFree && (
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 12,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
              {t('freeMessagesUsed')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
              {t('freeMessagesUpgrade')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowPlusModal(true)}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {t('upgradeToPremium')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </Animated.View>

      {/* TchopePlus modal */}
      <Modal visible={showPlusModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TchopePlusScreen onClose={() => setShowPlusModal(false)} />
        </View>
      </Modal>

      {/* Photo premium modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderRadius: 24,
            padding: 24,
            gap: 16,
            alignItems: 'center',
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="camera" size={28} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {t('premiumRequired')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {isFr
                ? "L'envoi de photos à TchopAI est réservé aux abonnés Tchopé Plus."
                : 'Sending photos to TchopAI is available for Tchopé Plus subscribers.'}
            </Text>
            <TouchableOpacity
              onPress={() => { setShowPhotoModal(false); setShowPlusModal(true); }}
              style={{
                backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14,
                paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center',
              }}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{t('upgradeToPremium')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{isFr ? 'Annuler' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
