import type { Category } from '@/types';

/** Clé de traduction du libellé de chaque catégorie (constants/translations.ts). */
export const CATEGORY_KEYS = {
  Plat: 'catPlat',
  Sauce: 'catSauce',
  Grillade: 'catGrillade',
  Boisson: 'catBoisson',
  Dessert: 'catDessert',
  Entrée: 'catEntree',
  Accompagnement: 'catAccompagnement',
} as const satisfies Record<Category, string>;
