import * as Notifications from 'expo-notifications';
import type { NotificationPreferences } from '@/types';
import { getRecipeOfTheDay } from '@/widgets/data';

// ── Helpers ───────────────────────────────────────────────────────

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

async function cancelAllScheduled() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Permission ────────────────────────────────────────────────────

export async function getNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Meal Reminder ─────────────────────────────────────────────────

async function scheduleMealReminder(
  time: string,
  recipeName: string | null,
  isFr: boolean,
) {
  const { hour, minute } = parseTime(time);
  const title = isFr ? '🍽️ C\'est bientôt l\'heure !' : '🍽️ Almost time!';
  const body = recipeName
    ? (isFr ? `Au menu aujourd'hui : ${recipeName} — Bon appétit !` : `On today's menu: ${recipeName} — Bon appétit!`)
    : (isFr ? 'Consultez votre plan et choisissez une recette !' : 'Check your plan and pick a recipe!');

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { screen: '/planner' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Recipe of the Day ─────────────────────────────────────────────

async function scheduleRecipeOfTheDay(time: string, isFr: boolean) {
  const { hour, minute } = parseTime(time);
  const recipe = getRecipeOfTheDay();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isFr
        ? `${recipe.emoji} Recette du jour : ${recipe.name}`
        : `${recipe.emoji} Recipe of the day: ${recipe.name}`,
      body: isFr
        ? `${recipe.region} · ${recipe.duration} min — Découvrez la recette !`
        : `${recipe.region} · ${recipe.duration} min — Check it out!`,
      sound: true,
      data: { screen: `/recipe/${recipe.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Shopping List Reminder ────────────────────────────────────────

async function scheduleShoppingReminder(
  time: string,
  isFr: boolean,
  itemCount: number,
) {
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isFr ? '🛒 Liste de courses' : '🛒 Shopping list',
      body: isFr
        ? `Vous avez ${itemCount} article${itemCount > 1 ? 's' : ''} à acheter — N'oubliez rien !`
        : `You have ${itemCount} item${itemCount > 1 ? 's' : ''} to buy — Don't forget anything!`,
      sound: true,
      data: { screen: '/shopping-list' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Main Sync ─────────────────────────────────────────────────────

export type SyncNotificationOptions = {
  hasMealPlan?: boolean;
  currentMealRecipeName?: string | null;
  shoppingItemCount?: number;
};

export async function syncNotifications(
  prefs: NotificationPreferences,
  isFr: boolean,
  options?: SyncNotificationOptions,
) {
  // Cancel everything first, then reschedule what's enabled
  await cancelAllScheduled();

  const hasPermission = await getNotificationPermission();
  if (!hasPermission) return;

  // Only schedule meal reminder if there's an active meal plan
  if (prefs.mealReminder && options?.hasMealPlan) {
    await scheduleMealReminder(prefs.mealReminderTime, options.currentMealRecipeName ?? null, isFr);
  }

  if (prefs.recipeOfTheDay) {
    await scheduleRecipeOfTheDay(prefs.recipeOfTheDayTime, isFr);
  }

  // Only schedule shopping reminder if there are items to buy
  if (prefs.shoppingListReminder && options?.shoppingItemCount && options.shoppingItemCount > 0) {
    await scheduleShoppingReminder(prefs.shoppingListReminderTime, isFr, options.shoppingItemCount);
  }
}
