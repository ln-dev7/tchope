// English translations for recipes - merged from batch files
import { batch1 } from './recipes-en-batch1';
import { batch2 } from './recipes-en-batch2';
import { batch3 } from './recipes-en-batch3';
import { batch4 } from './recipes-en-batch4';
import { batch5 } from './recipes-en-batch5';

export type RecipeTranslation = {
  description?: string;
  ingredients?: { name: string; quantity: string }[];
  steps?: string[];
  tips?: string | null;
};

export const recipesEn: Record<string, RecipeTranslation> = {
  ...batch1,
  ...batch2,
  ...batch3,
  ...batch4,
  ...batch5,
};
