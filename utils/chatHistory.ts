import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tchope_chat_history';
export const MAX_SAVED_CHATS = 10;

export type SavedChat = {
  id: string;
  title: string;
  messages: SavedMessage[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type SavedMessage = {
  id: string;
  role: 'user' | 'assistant' | 'info';
  content: string;
};

async function loadAll(): Promise<SavedChat[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveAll(chats: SavedChat[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export async function getChatHistory(): Promise<SavedChat[]> {
  const chats = await loadAll();
  // Sort by updatedAt descending (most recent first)
  return chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveChat(chat: SavedChat): Promise<void> {
  const chats = await loadAll();
  const idx = chats.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    chats[idx] = chat;
  } else {
    chats.unshift(chat);
  }
  // Keep only the most recent MAX_SAVED_CHATS
  const trimmed = chats
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SAVED_CHATS);
  await saveAll(trimmed);
}

export async function deleteChat(chatId: string): Promise<void> {
  const chats = await loadAll();
  await saveAll(chats.filter((c) => c.id !== chatId));
}

export async function clearAllChats(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
