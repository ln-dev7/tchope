import type { UserRecipe, Note } from '@/types';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'info';
  content: string;
  recipeIds?: string[];
  saveRecipe?: UserRecipe;
  noteIds?: string[];
  saveNote?: Note;
};
