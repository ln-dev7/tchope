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
  Alert,
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
import { useImageQuota } from '@/hooks/useImageQuota';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalizedRecipes } from '@/hooks/useLocalizedRecipes';
import { callClaude, callClaudeLive, fetchRecipeUrl } from '@/utils/api';
import { getChatHistory, saveChat, deleteChat, clearAllChats, MAX_SAVED_CHATS, type SavedChat } from '@/utils/chatHistory';
import * as ImagePicker from 'expo-image-picker';
import * as ClipboardModule from 'expo-clipboard';
import TchopePlusScreen from '@/components/premium/TchopePlusScreen';
import RecipeImage from '@/components/RecipeImage';
import { useUserRecipes } from '@/context/UserRecipesContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useMealPlanner } from '@/context/MealPlannerContext';
import type { Recipe, UserRecipe } from '@/types';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'info';
  content: string;
  recipeIds?: string[];
  saveRecipe?: UserRecipe;
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
- Tu ne réponds QU'aux questions liées à la cuisine, aux recettes, à la nourriture et aux fonctionnalités de l'app Tchopé
- Ta spécialité est la cuisine camerounaise, mais tu acceptes aussi les recettes internationales qui font partie du quotidien camerounais (riz basmati, spaghettis, couscous, etc.) ou que l'utilisateur veut cuisiner. Ne refuse JAMAIS une recette sous prétexte qu'elle n'est pas camerounaise — au Cameroun on mange de tout ! Si la recette n'est pas camerounaise, donne-la quand même et propose éventuellement un accompagnement ou une touche camerounaise.
- Si on te pose une question hors sujet (politique, code, maths, etc.), réponds poliment que tu es spécialisé en cuisine et redirige la conversation
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

ANALYSE DE LIENS :
Si l'utilisateur envoie un lien/URL de recette, le contenu de la page sera extrait et ajouté à son message. Analyse ce contenu pour répondre à sa question (résumer la recette, donner des conseils, l'ajouter au cookbook, etc.). Si le contenu ne semble pas être une recette valide, dis-le poliment.

AJOUT DE RECETTE AU COOKBOOK :
Quand l'utilisateur te demande d'ajouter une recette à son cookbook (qu'il te donne les détails, qu'il mentionne une recette connue, ou qu'il te donne un lien/description d'internet), tu DOIS générer la recette complète au format JSON sur la DERNIÈRE ligne de ta réponse :
[SAVE_RECIPE:{"name":"...","description":"...","region":"...","category":"...","duration":...,"difficulty":"...","spiciness":"...","servings":...,"ingredients":[{"name":"...","quantity":"..."}],"steps":["..."],"tips":"..."}]
Règles :
- region doit TOUJOURS être "TchopAI" (toute recette ajoutée via le chat utilise cette région)
- category doit être une de : Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement
- difficulty doit être : Easy, Medium, ou Hard
- spiciness doit être : Mild, Medium, ou Extra Hot
- duration est en minutes (nombre)
- servings est un nombre
- steps est un tableau de strings, chaque étape étant une phrase claire
- ingredients est un tableau d'objets avec name et quantity
- tips est optionnel (string ou null)
- Le JSON doit être valide et sur UNE seule ligne
- La région est TOUJOURS "TchopAI", ne mets jamais une autre région
- Avant le JSON, écris un court message confirmant l'ajout et décrivant brièvement la recette

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
- ONLY answer questions related to cooking, recipes, food and Tchopé app features
- Your specialty is Cameroonian cuisine, but you also accept international recipes that are part of everyday Cameroonian life (basmati rice, spaghetti, couscous, etc.) or that the user wants to cook. NEVER refuse a recipe just because it's not Cameroonian — in Cameroon we eat everything! If the recipe is not Cameroonian, give it anyway and optionally suggest a Cameroonian side dish or twist.
- If asked about off-topic subjects (politics, code, math, etc.), politely say you specialize in cooking and redirect the conversation
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

LINK ANALYSIS:
If the user sends a recipe link/URL, the page content will be extracted and added to their message. Analyze this content to answer their question (summarize the recipe, give tips, add it to the cookbook, etc.). If the content doesn't seem to be a valid recipe, politely say so.

ADD RECIPE TO COOKBOOK:
When the user asks you to add a recipe to their cookbook (whether they give you details, mention a known recipe, or give you a link/description from the internet), you MUST generate the full recipe in JSON format on the LAST line of your response:
[SAVE_RECIPE:{"name":"...","description":"...","region":"...","category":"...","duration":...,"difficulty":"...","spiciness":"...","servings":...,"ingredients":[{"name":"...","quantity":"..."}],"steps":["..."],"tips":"..."}]
Rules:
- region must ALWAYS be "TchopAI" (all recipes added via chat use this region)
- category must be one of: Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement
- difficulty must be: Easy, Medium, or Hard
- spiciness must be: Mild, Medium, or Extra Hot
- duration is in minutes (number)
- servings is a number
- steps is an array of strings, each step being a clear sentence
- ingredients is an array of objects with name and quantity
- tips is optional (string or null)
- The JSON must be valid and on ONE single line
- The region is ALWAYS "TchopAI", never use any other region
- Before the JSON, write a short message confirming the addition and briefly describing the recipe

RECIPES AVAILABLE IN THE APP:
{RECIPES}`;

function SaveRecipeButton({ recipe, isDark, colors, onSave, alreadySaved, t }: {
  recipe: UserRecipe; isDark: boolean; colors: any; isFr: boolean;
  onSave: (r: UserRecipe) => void; alreadySaved: boolean; t: (k: any) => string;
}) {
  const [saved, setSaved] = React.useState(alreadySaved);

  const handlePress = () => {
    if (saved) return;
    onSave(recipe);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={saved}
      activeOpacity={0.8}
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: saved
          ? (isDark ? '#2A2A2A' : '#F3F0EF')
          : colors.accent,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <Ionicons
        name={saved ? 'checkmark-circle' : 'book-outline'}
        size={18}
        color={saved ? colors.textMuted : '#FFFFFF'}
      />
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: saved ? colors.textMuted : '#FFFFFF',
      }}>
        {saved ? t('recipeAlreadyAdded') : t('addToCookbook')}
      </Text>
    </TouchableOpacity>
  );
}

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
  const { addRecipe, userRecipes } = useUserRecipes();
  const { favorites } = useFavorites();
  const { currentPlan } = useMealPlanner();
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
  const imageQuota = useImageQuota();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: t('tchopaiWelcome'),
  }]);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState<SavedChat[]>([]);
  const chatIdRef = useRef<string>(Date.now().toString());
  const flatListRef = useRef<FlatList>(null);

  const isFr = settings.language === 'fr';
  const FREE_MESSAGE_LIMIT = 3;
  const canSendFree = isPremium || freeMessagesUsed < FREE_MESSAGE_LIMIT;

  // Load free message count (reset daily)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem('tchope_free_messages_date').then(async (savedDate) => {
      if (savedDate !== today) {
        await AsyncStorage.setItem('tchope_free_messages', '0');
        await AsyncStorage.setItem('tchope_free_messages_date', today);
        setFreeMessagesUsed(0);
      } else {
        const val = await AsyncStorage.getItem('tchope_free_messages');
        if (val) setFreeMessagesUsed(parseInt(val, 10));
      }
    });
  }, []);

  // Auto-save current chat when messages change (skip if only welcome message)
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
      messages: messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ id: m.id, role: m.role, content: m.content })),
      createdAt: chatIdRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [messages]);

  const buildSystemPrompt = useCallback(() => {
    const allRecipes = [...recipes, ...userRecipes];
    const recipeIndex = allRecipes
      .map((r) => `- [${r.id}] ${r.name} (${r.region}, ${r.category}, ${r.duration}min, ${r.difficulty}) : ${r.ingredients.map((i) => i.name).join(', ')}`)
      .join('\n');
    const template = isFr ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
    let prompt = template.replace('{RECIPES}', recipeIndex);

    // --- Dynamic user context ---
    const sections: string[] = [];

    // Cookbook = favorites + user-created recipes
    const favNames = favorites
      .map((fid) => allRecipes.find((r) => r.id === fid)?.name)
      .filter(Boolean);
    const userRecipeNames = userRecipes.map((r) => r.name);
    if (favNames.length > 0 || userRecipeNames.length > 0) {
      const parts: string[] = [];
      if (favNames.length > 0) {
        parts.push(isFr
          ? `Favoris (${favNames.length}) : ${favNames.join(', ')}`
          : `Favorites (${favNames.length}): ${favNames.join(', ')}`);
      }
      if (userRecipeNames.length > 0) {
        parts.push(isFr
          ? `Recettes créées (${userRecipeNames.length}) : ${userRecipeNames.join(', ')}`
          : `Created recipes (${userRecipeNames.length}): ${userRecipeNames.join(', ')}`);
      }
      sections.push(isFr
        ? `COOKBOOK DE L'UTILISATEUR (ce sont les recettes dans son cookbook, tu y as accès) :\n${parts.join('\n')}`
        : `USER'S COOKBOOK (these are the recipes in their cookbook, you have access to them):\n${parts.join('\n')}`);
    }

    // Meal plan
    if (currentPlan) {
      const dayLines: string[] = [];
      const sortedDates = Object.keys(currentPlan.days).sort();
      const dayNames = isFr
        ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const date of sortedDates) {
        const day = currentPlan.days[date];
        const d = new Date(date + 'T00:00:00');
        const dayName = dayNames[d.getDay()];
        const meals = day.meals
          .map((m) => {
            const recipe = allRecipes.find((r) => r.id === m.recipeId);
            return recipe ? `${m.label}: ${recipe.name}` : null;
          })
          .filter(Boolean)
          .join(', ');
        if (meals) dayLines.push(`${dayName} ${date.slice(5)} — ${meals}`);
      }
      if (dayLines.length > 0) {
        // Build shopping list from plan
        const ingredientMap = new Map<string, Set<string>>();
        for (const date of sortedDates) {
          for (const meal of currentPlan.days[date].meals) {
            const recipe = allRecipes.find((r) => r.id === meal.recipeId);
            if (recipe) {
              for (const ing of recipe.ingredients) {
                const key = ing.name.toLowerCase();
                if (!ingredientMap.has(key)) ingredientMap.set(key, new Set());
                ingredientMap.get(key)!.add(ing.quantity);
              }
            }
          }
        }
        const shoppingLines = Array.from(ingredientMap.entries())
          .map(([name, quantities]) => `${name} (${Array.from(quantities).join(' + ')})`)
          .join(', ');

        sections.push(isFr
          ? `PLAN DE REPAS ACTUEL (${currentPlan.startDate} au ${currentPlan.endDate}) :\n${dayLines.join('\n')}${currentPlan.preferences ? `\nPréférences : ${currentPlan.preferences}` : ''}\n\nLISTE DE COURSES DU PLAN :\n${shoppingLines}`
          : `CURRENT MEAL PLAN (${currentPlan.startDate} to ${currentPlan.endDate}):\n${dayLines.join('\n')}${currentPlan.preferences ? `\nPreferences: ${currentPlan.preferences}` : ''}\n\nSHOPPING LIST FROM PLAN:\n${shoppingLines}`);
      }
    }

    // App features knowledge
    sections.push(isFr
      ? `FONCTIONNALITÉS DE L'APP TCHOPÉ :
L'app contient plus de 100 recettes camerounaises authentiques des 10 régions du Cameroun.
Écrans principaux : Accueil (recettes par région, mises en avant), Recherche (par nom, catégorie, niveau de piment, ingrédients), Planificateur de repas (plan hebdomadaire, génération IA, échange de repas, export PDF), Cookbook (favoris et recettes créées), Paramètres (thème, langue, notifications).
Autres fonctionnalités : Mode cuisine (étape par étape avec timer intégré, lecture vocale), TchopAI Live (assistant vocal temps réel pendant la cuisine, premium), Recherche par ingrédients disponibles (premium), Liste de courses (auto-générée depuis le plan, cocher les items, partager), Page minuteur (timers multiples, préréglages cuisine), Ajout de recettes personnelles, Vidéos de recettes YouTube.
Catégories : Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement.
Niveaux de piment : Doux, Moyen, Extra Piquant.
Difficulté : Facile, Moyen, Difficile.
Régions : Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest.
Tu peux guider l'utilisateur vers n'importe quelle fonctionnalité en lui expliquant comment y accéder.`
      : `TCHOPÉ APP FEATURES:
The app contains 100+ authentic Cameroonian recipes from all 10 regions.
Main screens: Home (recipes by region, featured), Search (by name, category, spice level, ingredients), Meal Planner (weekly plan, AI generation, meal swaps, PDF export), Cookbook (favorites and created recipes), Settings (theme, language, notifications).
Other features: Cooking Mode (step-by-step with built-in timer, voice reading), TchopAI Live (real-time voice assistant during cooking, premium), Search by available ingredients (premium), Shopping List (auto-generated from plan, check items, share), Timer page (multiple timers, cooking presets), Custom recipe creation, YouTube recipe videos.
Categories: Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement.
Spice levels: Mild, Medium, Extra Hot.
Difficulty: Easy, Medium, Hard.
Regions: Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest.
You can guide the user to any feature by explaining how to access it.`);

    if (sections.length > 0) {
      prompt += '\n\n' + sections.join('\n\n');
    }

    return prompt;
  }, [recipes, userRecipes, favorites, currentPlan, isFr]);

  function stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')    // **bold**
      .replace(/\*(.+?)\*/g, '$1')         // *italic*
      .replace(/__(.+?)__/g, '$1')         // __bold__
      .replace(/_(.+?)_/g, '$1')           // _italic_
      .replace(/~~(.+?)~~/g, '$1')         // ~~strike~~
      .replace(/`(.+?)`/g, '$1')           // `code`
      .replace(/^#{1,6}\s+/gm, '')         // # headings
      .replace(/^[\-\*]\s+/gm, '• ')       // - list → bullet
      .replace(/^\d+\.\s+/gm, '• ');       // 1. list → bullet
  }

  function parseResponse(text: string): { content: string; recipeIds: string[]; saveRecipe?: UserRecipe } {
    let remaining = text;
    let saveRecipe: UserRecipe | undefined;

    // Parse [SAVE_RECIPE:{...}]
    const saveMatch = remaining.match(/\[SAVE_RECIPE:(\{[\s\S]*\})\]\s*$/);
    if (saveMatch) {
      remaining = remaining.slice(0, remaining.lastIndexOf('[SAVE_RECIPE:')).trimEnd();
      try {
        const parsed = JSON.parse(saveMatch[1]);
        saveRecipe = {
          ...parsed,
          id: 'user-' + Date.now(),
          image: null,
          region: 'TchopAI',
          rating: 0,
          isUserCreated: true,
          createdAt: new Date().toISOString(),
        };
      } catch {}
    }

    // Parse [RECIPES:id1,id2]
    const match = remaining.match(/\[RECIPES:\s*([^\]]+)\]\s*$/);
    if (!match) return { content: stripMarkdown(remaining), recipeIds: [], saveRecipe };
    const content = remaining.slice(0, remaining.lastIndexOf('[RECIPES:')).trimEnd();
    const recipeIds = match[1]
      .split(',')
      .map((id) => id.trim())
      .filter((id) => recipes.some((r) => r.id === id));
    return { content: stripMarkdown(content), recipeIds, saveRecipe };
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
    setLoadingMessage(isFr ? 'TchopAI réfléchit...' : 'TchopAI is thinking...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Detect URL in message and fetch content
      const urlMatch = text.match(/https?:\/\/[^\s]+/i);
      let enrichedText = text;
      if (urlMatch) {
        setLoadingMessage(isFr ? 'Analyse du lien en cours...' : 'Analyzing link...');
        const urlContent = await fetchRecipeUrl(urlMatch[0]);
        if (urlContent) {
          enrichedText = `${text}\n\n[Contenu extrait du lien :\n${urlContent}]`;
        }
        setLoadingMessage(isFr ? 'Préparation de la réponse...' : 'Preparing response...');
      }

      const enrichedMsg = { ...userMsg, content: enrichedText };
      const history = [...messages.filter((m) => m.id !== 'welcome' && m.role !== 'info'), enrichedMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: history,
      });

      const parsed = parseResponse(response);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsed.content,
        recipeIds: parsed.recipeIds,
        saveRecipe: parsed.saveRecipe,
      }]);

      // Increment free message counter for non-premium users
      if (!isPremium) {
        const current = await AsyncStorage.getItem('tchope_free_messages');
        const newCount = (current ? parseInt(current, 10) : 0) + 1;
        await AsyncStorage.setItem('tchope_free_messages', String(newCount));
        setFreeMessagesUsed(newCount);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('tchopaiError'),
      }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleNewChat = () => {
    chatIdRef.current = Date.now().toString();
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: t('tchopaiWelcome'),
    }]);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenHistory = async () => {
    const history = await getChatHistory();
    setChatHistoryList(history);
    setShowHistoryModal(true);
  };

  const handleLoadChat = (chat: SavedChat) => {
    chatIdRef.current = chat.id;
    setMessages([
      { id: 'welcome', role: 'assistant', content: t('tchopaiWelcome') },
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
    Alert.alert(
      t('deleteAllHistoryConfirm'),
      t('deleteAllHistoryDesc'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await clearAllChats();
            setChatHistoryList([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const [showSourceModal, setShowSourceModal] = useState(false);

  const handlePhotoPress = () => {
    if (!isPremium) {
      setShowPhotoModal(true);
      return;
    }
    setShowSourceModal(true);
  };

  const pickAndSendPhoto = async (source: 'camera' | 'gallery') => {
    setShowSourceModal(false);
    try {
      // Check image quota before proceeding
      if (!imageQuota.canSend) {
        Alert.alert(
          isFr ? 'Limite atteinte' : 'Limit reached',
          t('imageQuotaReached'),
        );
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
      const remaining = imageQuota.remaining - 1; // after increment
      const base64Data = result.assets[0].base64;
      const quotaInfo = remaining <= 0
        ? (isFr ? `📷 0/${imageQuota.limit} — ${t('imageQuotaReached')}` : `📷 0/${imageQuota.limit} — ${t('imageQuotaReached')}`)
        : `📷 ${remaining}/${imageQuota.limit} ${t('imageQuota')}`;
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: isFr ? '📷 Photo envoyée' : '📷 Photo sent' };
      const quotaMsg: Message = { id: `quota-${Date.now()}`, role: 'info', content: quotaInfo };
      setMessages((prev) => [...prev, userMsg, quotaMsg]);
      setLoading(true);
      setLoadingMessage(isFr ? 'Analyse de la photo...' : 'Analyzing photo...');

      const history = [...messages.filter((m) => m.id !== 'welcome' && m.role !== 'info'), userMsg].map((m) => ({
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
        saveRecipe: parsed.saveRecipe,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('tchopaiError'),
      }]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Info messages (quota notifications) — centered small text
    if (item.role === 'info') {
      return (
        <View style={{ alignSelf: 'center', marginBottom: 8, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
            {item.content}
          </Text>
        </View>
      );
    }

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
        {!isUser && item.id !== 'welcome' && (
          <TouchableOpacity
            onPress={() => {
              ClipboardModule.setStringAsync(item.content);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCopiedId(item.id);
              setTimeout(() => setCopiedId((prev) => prev === item.id ? null : prev), 1500);
            }}
            style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={copiedId === item.id ? 'checkmark' : 'copy-outline'} size={14} color={copiedId === item.id ? colors.green : colors.textMuted} />
            {copiedId === item.id && (
              <Text style={{ fontSize: 11, color: colors.green, fontWeight: '600' }}>
                {isFr ? 'Copié' : 'Copied'}
              </Text>
            )}
          </TouchableOpacity>
        )}
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
        {item.saveRecipe && (
          <SaveRecipeButton
            recipe={item.saveRecipe}
            isDark={isDark}
            colors={colors}
            isFr={isFr}
            onSave={addRecipe}
            alreadySaved={userRecipes.some((r) => r.id === item.saveRecipe!.id)}
            t={t}
          />
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
          onPress={handleNewChat}
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
          <Ionicons name="create-outline" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleOpenHistory}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="time-outline" size={18} color={colors.text} />
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' }}>
              {loadingMessage || (isFr ? 'TchopAI réfléchit...' : 'TchopAI is thinking...')}
            </Text>
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
            disabled={loading || !imageQuota.canSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
              opacity: loading || !imageQuota.canSend ? 0.4 : 1,
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
              {t('freeMessagesUsed').replace('{limit}', String(FREE_MESSAGE_LIMIT))}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
              {t('freeMessagesUpgrade').replace('{limit}', String(FREE_MESSAGE_LIMIT))}
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
      <Modal visible={showPlusModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPlusModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TchopePlusScreen onClose={() => setShowPlusModal(false)} />
        </View>
      </Modal>

      {/* Photo source picker modal */}
      <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: bottom + 16 }}>
          <View style={{
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <TouchableOpacity
              onPress={() => pickAndSendPhoto('camera')}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}>
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {isFr ? 'Prendre une photo' : 'Take a photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickAndSendPhoto('gallery')}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
              }}>
              <Ionicons name="images-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {isFr ? 'Choisir dans la galerie' : 'Choose from gallery'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowSourceModal(false)}
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderRadius: 20,
              paddingVertical: 16,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Photo premium modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
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

      {/* Chat history modal */}
      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* History header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: colors.surface,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 }}>
                {t('chatHistory')}
              </Text>
              {chatHistoryList.length > 0 && (
                <TouchableOpacity onPress={handleClearAllHistory}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#E74C3C' }}>
                    {t('deleteAllHistory')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Limit info */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                {t('chatHistoryLimit').replace('{count}', String(MAX_SAVED_CHATS))}
              </Text>
            </View>

            {/* Chat list */}
            {chatHistoryList.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={{ fontSize: 15, color: colors.textMuted }}>
                  {t('chatHistoryEmpty')}
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
                  const isYesterday = date.toDateString() === yesterday.toDateString();
                  const dateStr = isToday
                    ? t('today')
                    : isYesterday
                      ? t('yesterday')
                      : date.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
                  const timeStr = date.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                  const msgCount = item.messages.filter((m) => m.role !== 'info').length;

                  return (
                    <TouchableOpacity
                      onPress={() => handleLoadChat(item)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                        borderRadius: 16,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 1,
                        borderColor: isDark ? '#3A3A3A' : '#E8E5E4',
                      }}
                    >
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.1)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="chatbubble-outline" size={18} color="#A855F7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                          {dateStr} · {timeStr} · {msgCount} msg
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteChat(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
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
