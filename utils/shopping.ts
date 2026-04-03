import type { Recipe } from '@/types';
import type { MealPlan } from '@/context/MealPlannerContext';

/**
 * Count unique shopping list items from a meal plan.
 */
export function getShoppingItemCount(
  plan: MealPlan | null,
  recipeMap: Record<string, Recipe>,
): number {
  if (!plan) return 0;

  const uniqueItems = new Set<string>();

  Object.values(plan.days).forEach((day) => {
    day.meals.forEach((meal) => {
      const recipe = recipeMap[meal.recipeId];
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        uniqueItems.add(ing.name.toLowerCase().trim());
      });
    });
  });

  return uniqueItems.size;
}
