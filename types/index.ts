export type Region =
  | 'Littoral'
  | 'Ouest'
  | 'Centre'
  | 'Sud'
  | 'Nord'
  | 'Est'
  | 'Adamaoua'
  | 'Extrême-Nord'
  | 'Nord-Ouest'
  | 'Sud-Ouest'
  | 'TchopAI';

export type Category =
  | 'Plat'
  | 'Sauce'
  | 'Grillade'
  | 'Boisson'
  | 'Dessert'
  | 'Entrée'
  | 'Accompagnement';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Spiciness = 'Mild' | 'Medium' | 'Extra Hot';

export type Recipe = {
  id: string;
  name: string;
  description: string;
  image: unknown | null;
  region: Region;
  category: Category;
  duration: number;
  difficulty: Difficulty;
  spiciness: Spiciness;
  servings: number;
  rating: number;
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  tips?: string | null;
  isFeatured?: boolean;
  tags?: string[];
};

export type UserRecipe = Recipe & {
  isUserCreated: true;
  createdAt: string;
  imageUri?: string | null;
};

export type NotificationPreferences = {
  mealReminder: boolean;
  mealReminderTime: string; // "HH:mm" format
  recipeOfTheDay: boolean;
  recipeOfTheDayTime: string;
  shoppingListReminder: boolean;
  shoppingListReminderTime: string;
};

export type Settings = {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  notifications: NotificationPreferences;
};
