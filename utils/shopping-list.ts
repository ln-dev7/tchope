import type { Recipe } from '../types';
import type { MealPlan } from '../context/MealPlannerContext';
import { scaleQuantity } from './quantity';
export type ShoppingSelection = { id: string; recipeId: string; servings: number };
export type ShoppingItem = { key: string; name: string; quantity: string; recipes: string[] };

/** Keep every contribution: two meals requiring 500 g must never become just 500 g.
 * Stable ingredient names come from the base catalogue; displayed names stay localized.
 * Checkbox identity includes the source and quantities, so changed needs become unchecked.
 */
export function buildShoppingList(plan: MealPlan | null, selections: ShoppingSelection[], recipeMap: Record<string, Recipe>, baseMap: Record<string, Recipe>): ShoppingItem[] {
  const sources = selections.map(s => ({ ...s, source: `extra:${s.id}` }));
  if (plan) Object.entries(plan.days).forEach(([date, day]) => day.meals.forEach((meal, index) => {
    sources.push({ id: '', recipeId: meal.recipeId, servings: meal.servings ?? recipeMap[meal.recipeId]?.servings ?? 1, source: `${plan.id}:${date}:${index}` });
  }));
  const groups = new Map<string, { name: string; quantities: string[]; recipes: Set<string>; contributions: string[] }>();
  sources.forEach(source => {
    const recipe = recipeMap[source.recipeId];
    if (!recipe) return;
    recipe.ingredients.forEach((ingredient, index) => {
      const base = baseMap[recipe.id]?.ingredients[index] ?? ingredient;
      const identity = base.name.trim().toLocaleLowerCase();
      const group = groups.get(identity) ?? { name: ingredient.name, quantities: [], recipes: new Set<string>(), contributions: [] };
      const quantity = scaleQuantity(ingredient.quantity, source.servings / (recipe.servings || 1));
      if (quantity) group.quantities.push(quantity);
      group.recipes.add(recipe.name);
      group.contributions.push(`${source.source}:${recipe.id}:${index}:${source.servings}:${base.quantity}`);
      groups.set(identity, group);
    });
  });
  return [...groups.entries()].map(([identity, group]) => ({
    key: JSON.stringify([identity, group.contributions.sort()]), name: group.name,
    quantity: group.quantities.join(' + '), recipes: [...group.recipes],
  })).sort((a, b) => a.name.localeCompare(b.name));
}
