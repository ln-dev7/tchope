import { useState, useMemo } from 'react';
import type { Recipe, Spiciness } from '@/types';

type Filters = {
  duration?: 'under30' | '30to60' | 'over60';
  spiciness?: Spiciness;
  ingredient?: string;
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesDuration(recipe: Recipe, filter: Filters['duration']): boolean {
  if (!filter) return true;
  switch (filter) {
    case 'under30':
      return recipe.duration < 30;
    case '30to60':
      return recipe.duration >= 30 && recipe.duration <= 60;
    case 'over60':
      return recipe.duration > 60;
    default:
      return true;
  }
}

function matchesText(recipe: Recipe, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);

  const searchable = [
    recipe.name,
    recipe.description,
    recipe.id,
    ...(recipe.tags ?? []),
    ...recipe.ingredients.map((i) => i.name),
    ...recipe.steps,
  ];

  return searchable.some((field) => normalize(field).includes(q));
}

function matchesIngredient(recipe: Recipe, ingredient: string): boolean {
  if (!ingredient) return true;
  const q = normalize(ingredient);

  // Search in ingredient names, steps, description, and recipe name
  const searchable = [
    ...recipe.ingredients.map((i) => i.name),
    ...recipe.steps,
    recipe.description,
    recipe.name,
  ];

  return searchable.some((field) => normalize(field).includes(q));
}

export function useSearch(recipes: Recipe[]) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  const results = useMemo(() => {
    return recipes.filter((recipe) => {
      if (!matchesText(recipe, query)) return false;
      if (!matchesDuration(recipe, filters.duration)) return false;
      if (filters.spiciness && recipe.spiciness !== filters.spiciness) return false;
      if (filters.ingredient && !matchesIngredient(recipe, filters.ingredient)) return false;
      return true;
    });
  }, [recipes, query, filters]);

  return { results, query, setQuery, filters, setFilters };
}
