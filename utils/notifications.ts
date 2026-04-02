import * as Notifications from 'expo-notifications';
import type { NotificationPreferences } from '@/types';

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
  const title = isFr ? 'Bon appétit !' : 'Bon appétit!';
  const body = recipeName
    ? (isFr ? `C'est bientôt l'heure ! Aujourd'hui : ${recipeName}` : `Almost time! Today: ${recipeName}`)
    : (isFr ? "C'est bientôt l'heure du repas ! Consultez votre plan." : 'Almost meal time! Check your plan.');

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isFr ? 'Recette du jour' : 'Recipe of the day',
      body: isFr
        ? 'Découvrez une nouvelle recette camerounaise !'
        : 'Discover a new Cameroonian recipe!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,

    },
  });
}

// ── Shopping List Reminder ────────────────────────────────────────

async function scheduleShoppingReminder(time: string, isFr: boolean) {
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isFr ? 'Liste de courses' : 'Shopping list',
      body: isFr
        ? "N'oubliez pas votre liste de courses !"
        : "Don't forget your shopping list!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,

    },
  });
}

// ── Main Sync ─────────────────────────────────────────────────────

export async function syncNotifications(
  prefs: NotificationPreferences,
  isFr: boolean,
  options?: { hasMealPlan?: boolean; currentMealRecipeName?: string | null },
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

  if (prefs.shoppingListReminder) {
    await scheduleShoppingReminder(prefs.shoppingListReminderTime, isFr);
  }
}
