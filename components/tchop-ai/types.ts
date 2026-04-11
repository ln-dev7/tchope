import type { UserRecipe } from '@/types';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'info';
  content: string;
  recipeIds?: string[];
  saveRecipe?: UserRecipe;
};
