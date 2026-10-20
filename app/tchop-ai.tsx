import { AdaptiveModal } from '@/components/AdaptiveModal';
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useSettings } from "@/context/SettingsContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useImageQuota } from "@/hooks/useImageQuota";
import { useLocalizedRecipes } from "@/hooks/useLocalizedRecipes";
import { useUserRecipes } from "@/context/UserRecipesContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useMealPlanner } from "@/context/MealPlannerContext";
import { useNotes } from "@/context/NotesContext";
import { callClaude, callClaudeLive, fetchRecipeUrl } from "@/utils/api";
import { isProRequired, requireAi } from "@/utils/proBridge";
import { usePro } from "@/context/ProContext";
import { proDict, fill } from "@/constants/pro-translations";
import { FREE_CHAT_MESSAGES } from "@/lib/pro";
import {
  getChatHistory,
  saveChat,
  deleteChat,
  clearAllChats,
  MAX_SAVED_CHATS,
  type SavedChat,
} from "@/utils/chatHistory";

import type { Message } from "@/components/tchop-ai/types";
import { parseResponse, buildSystemPrompt } from "@/components/tchop-ai/utils";
import ChatHeader from "@/components/tchop-ai/ChatHeader";
import ChatMessage from "@/components/tchop-ai/ChatMessage";
import ChatInput from "@/components/tchop-ai/ChatInput";
import AiLoading from "@/components/tchop-ai/AiLoading";
import { aiErrorMessage } from "@/utils/ai-errors";
import { prepareAiImage } from "@/utils/ai-image";
import { RequestScope } from "@/lib/live/request-scope";
import { type as typography } from "@/constants/design";

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
  const imageQuota = useImageQuota();
  // Tchopé Pro (17 oct. 2026) : 3 messages texte gratuits au total, tout le reste réservé aux abonnés.
  const { pro, freeChatLeft, openPaywall } = usePro();
  const pd = proDict[settings.language === "en" ? "en" : "fr"];

  const isFr = settings.language === "fr";

  // --- State ---
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("tchopaiWelcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState<SavedChat[]>([]);
  const chatIdRef = useRef<string>(Date.now().toString());
  const flatListRef = useRef<FlatList>(null);

  const requests = useRef(new RequestScope());
  const nearBottom = useRef(true);
  const pendingMessage = useRef<{ id: string; text: string } | null>(null);
  const cancelRequest = useCallback(() => {
    requests.current.cancel();
    const pending = pendingMessage.current;
    if (pending) {
      setMessages((prev) => prev.filter((m) => m.id !== pending.id));
      if (pending.text) setInput((prev) => prev || pending.text);
    }
    pendingMessage.current = null;
    setLoading(false);
    setLoadingMessage("");
  }, []);
  useFocusEffect(useCallback(() => () => cancelRequest(), [cancelRequest]));

  // --- Keyboard handling ---
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height - (Platform.OS === "ios" ? bottom : 0),
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e.duration ?? 200) : 200,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [bottom, keyboardPadding]);

  // --- Auto-save chat ---
  useEffect(() => {
    const realMessages = messages.filter(
      (m) =>
        m.id !== "welcome" &&
        m.role !== "info" &&
        m.id !== pendingMessage.current?.id,
    );
    if (realMessages.length === 0) return;
    const firstUserMsg = realMessages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) +
        (firstUserMsg.content.length > 50 ? "..." : "")
      : "Chat";
    saveChat({
      id: chatIdRef.current,
      title,
      messages: realMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
      createdAt: chatIdRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [messages]);

  // --- Build prompt ---
  const getSystemPrompt = useCallback(() => {
    return buildSystemPrompt(
      recipes,
      userRecipes,
      favorites,
      currentPlan,
      isFr,
      notes,
    );
  }, [recipes, userRecipes, favorites, currentPlan, isFr, notes]);

  // --- Send message ---
  const handleSend = async () => {
    const text = input.trim();
    // Garde-fou : aucun envoi vers l'IA tant que le consentement n'est pas donné.
    if (!text || loading || !settings.aiConsent) return;
    Keyboard.dismiss();

    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "info",
          content: t("tchopaiOffline"),
        },
      ]);
      return;
    }
    // Messages gratuits épuisés : écran Tchopé Pro, le texte reste dans le champ.
    if (!requireAi("chat")) return;

    const request = requests.current.begin();
    if (!request) return;
    nearBottom.current = true;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    pendingMessage.current = { id: userMsg.id, text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setLoadingMessage(isFr ? "TchopAI réfléchit..." : "TchopAI is thinking...");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      let enrichedText = text;
      const urlMatch = text.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        setLoadingMessage(
          isFr ? "Analyse du lien en cours..." : "Analyzing link...",
        );
        const urlContent = await fetchRecipeUrl(urlMatch[0], request.signal);
        if (!request.current()) return;
        if (urlContent)
          enrichedText = `${text}\n\n[Contenu extrait du lien :\n${urlContent}]`;
        setLoadingMessage(
          isFr ? "Préparation de la réponse..." : "Preparing response...",
        );
      }

      if (!request.current()) return;
      const enrichedMsg = { ...userMsg, content: enrichedText };
      const history = [
        ...messages
          .filter((m) => m.id !== "welcome" && m.role !== "info")
          .slice(-20),
        enrichedMsg,
      ].map((m) => ({
        role: m.role,
        content: m.content.slice(0, 8000),
      }));

      const response = await callClaude(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          system: [
            {
              type: "text",
              text: getSystemPrompt(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: history,
        },
        "chat",
        { signal: request.signal },
      );
      if (!request.current()) return;
      pendingMessage.current = null;

      const parsed = parseResponse(response, recipes, notes);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: parsed.content,
          recipeIds: parsed.recipeIds,
          saveRecipe: parsed.saveRecipe,
          noteIds: parsed.noteIds,
          saveNote: parsed.saveNote,
        },
      ]);
    } catch (e) {
      if (!request.current()) return;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        ...(!isProRequired(e)
          ? [
              {
                id: `error-${Date.now()}`,
                role: "info" as const,
                content: aiErrorMessage(e, isFr),
              },
            ]
          : []),
      ]);
      pendingMessage.current = null;
      setInput((prev) => prev || text);
    } finally {
      if (request.current()) {
        setLoading(false);
        setLoadingMessage("");
      }
      request.finish();
    }
  };

  // --- Chat management ---
  const handleNewChat = () => {
    cancelRequest();
    nearBottom.current = true;
    chatIdRef.current = Date.now().toString();
    setMessages([
      { id: "welcome", role: "assistant", content: t("tchopaiWelcome") },
    ]);
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenHistory = async () => {
    setChatHistoryList(await getChatHistory());
    setShowHistoryModal(true);
  };

  const handleLoadChat = (chat: SavedChat) => {
    cancelRequest();
    setInput("");
    nearBottom.current = true;
    chatIdRef.current = chat.id;
    setMessages([
      { id: "welcome", role: "assistant", content: t("tchopaiWelcome") },
      ...chat.messages,
    ]);
    setShowHistoryModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    setChatHistoryList((prev) => prev.filter((c) => c.id !== chatId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClearAllHistory = () => {
    Alert.alert(t("deleteAllHistoryConfirm"), t("deleteAllHistoryDesc"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await clearAllChats();
          setChatHistoryList([]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  // --- Photo ---
  // Envoi de photo borné par useImageQuota (limite quotidienne d'images).
  const handlePhotoPress = () => {
    if (loading || !settings.aiConsent || !isConnected) return;
    if (!requireAi("chat-photo")) return; // photo : Tchopé Pro
    setShowSourceModal(true);
  };

  const pickAndSendPhoto = async (source: "camera" | "gallery") => {
    setShowSourceModal(false);
    if (
      !settings.aiConsent ||
      !isConnected ||
      !imageQuota.canSend ||
      !requireAi("chat-photo")
    )
      return;
    const request = requests.current.begin();
    if (!request) return;
    setLoading(true);
    setLoadingMessage(
      isFr
        ? "Choisissez une photo de votre préparation"
        : "Choose a photo of your dish",
    );
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isFr ? "Caméra non autorisée" : "Camera not allowed",
            isFr
              ? "Autorisez la caméra dans les réglages du téléphone, ou choisissez une photo dans la galerie."
              : "Allow camera access in your phone settings, or choose a photo from the gallery.",
          );
          return;
        }
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.8,
            });
      if (!request.current() || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const image = await prepareAiImage(asset.uri, asset.width, asset.height);
      if (!request.current()) return;
      nearBottom.current = true;
      const text =
        input.trim() ||
        (isFr
          ? "Que peux-tu observer sur cette photo pour m’aider à cuisiner ?"
          : "What can you observe in this photo to help me cook?");
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: `📷 ${text}`,
      };
      pendingMessage.current = { id: userMsg.id, text: input.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoadingMessage(
        isFr
          ? "TchopAI analyse votre photo"
          : "TchopAI is analyzing your photo",
      );
      const response = await callClaudeLive(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: getSystemPrompt(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            ...messages
              .filter((m) => m.id !== "welcome" && m.role !== "info")
              .slice(-20)
              .map((m) => ({
                role: m.role,
                content: m.content.slice(0, 8000),
              })),
            {
              role: "user",
              content: [
                { type: "text", text },
                { type: "image", source: { type: "base64", ...image } },
              ],
            },
          ],
        },
        "chat-photo",
        { signal: request.signal },
      );
      // Only an actual successful analysis consumes the existing daily photo allowance.
      await imageQuota.increment();
      if (!request.current()) return;
      pendingMessage.current = null;
      const parsed = parseResponse(response, recipes, notes);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-answer`,
          role: "assistant",
          content: parsed.content,
          recipeIds: parsed.recipeIds,
          saveRecipe: parsed.saveRecipe,
          noteIds: parsed.noteIds,
          saveNote: parsed.saveNote,
        },
      ]);
    } catch (e) {
      if (!request.current()) return;
      const pending = pendingMessage.current;
      if (pending?.text) setInput((prev) => prev || pending.text);
      pendingMessage.current = null;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== pending?.id),
        ...(!isProRequired(e)
          ? [
              {
                id: `error-${Date.now()}`,
                role: "info" as const,
                content: aiErrorMessage(e, isFr),
              },
            ]
          : []),
      ]);
    } finally {
      if (request.current()) {
        setLoading(false);
        setLoadingMessage("");
      }
      request.finish();
    }
  };

  // --- Render ---
  return (
    <SafeAreaView
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 840,
        alignSelf: "center",
        backgroundColor: colors.background,
      }}
      edges={["top", "bottom", "left", "right"]}
    >
      {!settings.aiConsent ? (
        <AiConsent
          colors={colors}
          isDark={isDark}
          t={t}
          locale={settings.language}
          onAgree={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateAiConsent(true);
          }}
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
            data={messages.filter((m) => m.id !== "welcome")}
            ListHeaderComponent={
              messages.every((m) => m.id === "welcome" || m.role === "info") ? (
                <View style={{ paddingVertical: 24, gap: 18 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      backgroundColor: colors.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={26}
                      color={colors.accent}
                    />
                  </View>
                  <Text
                    style={[
                      typography.display,
                      { fontSize: 34, lineHeight: 40, color: colors.text },
                    ]}
                  >
                    {isFr
                      ? "On cuisine quoi,\naujourd’hui ?"
                      : "What are we\ncooking today?"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 23,
                      color: colors.textSecondary,
                    }}
                  >
                    {isFr
                      ? "Une idée de repas, un ingrédient à remplacer ou une technique à comprendre. TchopAI vous accompagne."
                      : "A meal idea, an ingredient swap or a cooking technique. TchopAI is here to help."}
                  </Text>
                  {(isFr
                    ? [
                        "Que cuisiner avec du plantain ?",
                        "Comment réussir mon ndolé ?",
                        "Par quoi remplacer les arachides ?",
                      ]
                    : [
                        "What can I cook with plantain?",
                        "How can I make a great ndolé?",
                        "What can I use instead of peanuts?",
                      ]
                  ).map((prompt, i) => (
                    <TouchableOpacity
                      key={prompt}
                      accessibilityRole="button"
                      onPress={() => setInput(prompt)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 18,
                        backgroundColor: colors.card,
                      }}
                    >
                      <Ionicons
                        name={
                          i === 0
                            ? "restaurant-outline"
                            : i === 1
                              ? "bulb-outline"
                              : "swap-horizontal-outline"
                        }
                        size={20}
                        color={colors.accent}
                      />
                      <Text
                        style={{ flex: 1, color: colors.text, fontSize: 14 }}
                      >
                        {prompt}
                      </Text>
                      <Ionicons
                        name="arrow-up-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : undefined
            }
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
            onContentSizeChange={() => {
              if (nearBottom.current)
                flatListRef.current?.scrollToEnd({ animated: true });
            }}
            onScroll={({ nativeEvent: e }) => {
              nearBottom.current =
                e.contentSize.height -
                  e.layoutMeasurement.height -
                  e.contentOffset.y <
                100;
            }}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />

          {loading && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <AiLoading
                label={
                  loadingMessage ||
                  (isFr
                    ? "TchopAI prépare votre réponse"
                    : "TchopAI is preparing your answer")
                }
                isFr={isFr}
                colors={colors}
                onCancel={cancelRequest}
              />
            </View>
          )}

          {!pro ? (
            <TouchableOpacity
              onPress={() =>
                openPaywall(freeChatLeft === 0 ? "chat" : "settings")
              }
              accessibilityRole="button"
              style={{
                marginHorizontal: 16,
                marginBottom: 6,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={13}
                color={colors.accent}
              />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {freeChatLeft === 0
                  ? pd.chatOfferedNone
                  : fill(
                      freeChatLeft === 1
                        ? pd.chatOfferedOne
                        : pd.chatOfferedMany,
                      { left: freeChatLeft, n: FREE_CHAT_MESSAGES },
                    )}
                {" · "}
                <Text style={{ fontWeight: "800", color: colors.accent }}>
                  {pd.chatOfferedCta}
                </Text>
              </Text>
            </TouchableOpacity>
          ) : null}

          <ChatInput
            input={input}
            setInput={setInput}
            loading={loading}
            canSend={isConnected}
            canPhoto={imageQuota.canSend && isConnected}
            colors={colors}
            onSend={handleSend}
            onPhoto={handlePhotoPress}
            t={t}
          />
        </Animated.View>
      )}

      {/* Photo source picker */}
      <AdaptiveModal visible={showSourceModal} onClose={() => setShowSourceModal(false)} padding={16}>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => pickAndSendPhoto("camera")}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.accent,
                }}
              >
                {isFr ? "Prendre une photo" : "Take a photo"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickAndSendPhoto("gallery")}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Ionicons name="images-outline" size={20} color={colors.accent} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.accent,
                }}
              >
                {isFr ? "Choisir dans la galerie" : "Choose from gallery"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowSourceModal(false)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textMuted,
              }}
            >
              {isFr ? "Annuler" : "Cancel"}
            </Text>
          </TouchableOpacity>

</AdaptiveModal>

      {/* Chat history modal */}
      <AdaptiveModal visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} fill scroll={false} padding={0}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                {t("chatHistory")}
              </Text>
              {chatHistoryList.length > 0 && (
                <TouchableOpacity onPress={handleClearAllHistory}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.danger,
                    }}
                  >
                    {t("deleteAllHistory")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: "center",
                }}
              >
                {t("chatHistoryLimit").replace(
                  "{count}",
                  String(MAX_SAVED_CHATS),
                )}
              </Text>
            </View>
            {chatHistoryList.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={{ fontSize: 15, color: colors.textMuted }}>
                  {t("chatHistoryEmpty")}
                </Text>
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
                  const isYesterday =
                    date.toDateString() === yesterday.toDateString();
                  const dateStr = isToday
                    ? t("today")
                    : isYesterday
                      ? t("yesterday")
                      : date.toLocaleDateString(isFr ? "fr-FR" : "en-US", {
                          day: "numeric",
                          month: "short",
                        });
                  const timeStr = date.toLocaleTimeString(
                    isFr ? "fr-FR" : "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  const msgCount = item.messages.filter(
                    (m) => m.role !== "info",
                  ).length;

                  return (
                    <TouchableOpacity
                      onPress={() => handleLoadChat(item)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: colors.assistantCard,
                        borderRadius: 16,
                        padding: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        borderWidth: 1,
                        borderColor: colors.assistantBorder,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.accentSoft,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={18}
                          color={colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {dateStr} · {timeStr} · {msgCount} msg
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteChat(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>

</AdaptiveModal>
    </SafeAreaView>
  );
}

/** Écran de consentement (Apple 5.1.1(i)/5.1.2(i)) : divulgue les données
 *  envoyées à TchopAI + le prestataire IA (Anthropic) et recueille un accord
 *  explicite AVANT tout envoi. Affiché tant que settings.aiConsent est faux ;
 *  « J'accepte » le persiste et ne réapparaît plus. */
function AiConsent({
  colors,
  isDark,
  t,
  locale,
  onAgree,
  onBack,
}: {
  colors: any;
  isDark: boolean;
  t: (k: any) => string;
  locale: string;
  onAgree: () => void;
  onBack: () => void;
}) {
  const dataItems = t("aiConsentData").split("\n").filter(Boolean);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
          TchopAI
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 4 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: isDark
                ? `${colors.accent}20`
                : `${colors.accent}10`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={30}
              color={colors.accent}
            />
          </View>
          <Text
            style={{
              marginTop: 14,
              fontSize: 22,
              fontWeight: "800",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {t("aiConsentTitle")}
          </Text>
        </View>

        <Text
          style={{
            marginTop: 14,
            fontSize: 14,
            lineHeight: 21,
            color: colors.textSecondary,
          }}
        >
          {t("aiConsentBody")}
        </Text>

        <View style={{ marginTop: 14, gap: 10 }}>
          {dataItems.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={18}
                color={colors.accent}
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.text,
                  fontWeight: "600",
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            marginTop: 16,
            fontSize: 13,
            lineHeight: 20,
            color: colors.textMuted,
          }}
        >
          {t("aiConsentProvider")}
        </Text>

        <TouchableOpacity
          onPress={() =>
            WebBrowser.openBrowserAsync(
              `https://tchope.lndev.me/${locale}/privacy`,
            )
          }
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={15}
            color={colors.accent}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: colors.accent,
              textDecorationLine: "underline",
            }}
          >
            {t("aiConsentPrivacy")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAgree}
          style={{
            marginTop: 24,
            backgroundColor: colors.accent,
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{ fontSize: 15, fontWeight: "800", color: colors.onAccent }}
          >
            {t("aiConsentAgree")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
