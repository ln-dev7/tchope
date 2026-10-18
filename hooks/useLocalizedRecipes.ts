import { useMemo } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { recipes as baseRecipes } from '@/data/recipes';
import { recipesEn } from '@/data/recipes-en';
import type { Recipe } from '@/types';
import { photosFirst } from '@/constants/images';

export type LocalizedRecipe = Recipe;

/**
 * Returns all recipes localized to the current language.
 * French = original data, English = merged with translations.
 * Les plats sans photo fiable sont toujours en fin de liste (photosFirst).
 */
export function useLocalizedRecipes(): LocalizedRecipe[] {
  const { settings } = useSettings();

  return useMemo(() => {
    if (settings.language === 'fr') return photosFirst(baseRecipes);

    return photosFirst(baseRecipes).map((recipe) => {
      const en = recipesEn[recipe.id];
      if (!en) return recipe;

      return {
        ...recipe,
        name: en.name ?? recipe.name,
        description: en.description ?? recipe.description,
        ingredients: en.ingredients
          ? recipe.ingredients.map((ing, i) => ({
              name: en.ingredients![i]?.name ?? ing.name,
              quantity: en.ingredients![i]?.quantity ?? ing.quantity,
            }))
          : recipe.ingredients,
        steps: en.steps ?? recipe.steps,
        tips: en.tips !== undefined ? en.tips : recipe.tips,
      };
    });
  }, [settings.language]);
}
