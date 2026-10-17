import type { MealPlan, MealSlot } from '../context/MealPlannerContext';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function appendMeal(plan: MealPlan | null, date: string, meal: MealSlot): MealPlan {
  const days = { ...(plan?.days ?? {}) };
  days[date] = { meals: [...(days[date]?.meals ?? []), meal] };
  const dates = Object.keys(days).sort();
  return {
    id: plan?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: plan?.createdAt ?? new Date().toISOString(),
    preferences: plan?.preferences ?? '',
    startDate: dates[0], endDate: dates[dates.length - 1], days,
  };
}

export function removePlannedMeal(plan: MealPlan, date: string, index: number): MealPlan | null {
  const days = { ...plan.days };
  if (!days[date]) return plan;
  const meals = days[date].meals.filter((_, i) => i !== index);
  if (meals.length) days[date] = { meals }; else delete days[date];
  const dates = Object.keys(days).sort();
  return dates.length ? { ...plan, days, startDate: dates[0], endDate: dates[dates.length - 1] } : null;
}

/** Reusing a sparse manual plan preserves the gaps between its cooking days. */
export function shiftPlanDays(days: MealPlan['days'], start: Date): MealPlan['days'] {
  const dates = Object.keys(days).sort();
  if (!dates.length) return {};
  const origin = Date.parse(dates[0] + 'T00:00:00Z');
  return Object.fromEntries(dates.map(date => {
    const shifted = new Date(start);
    shifted.setDate(shifted.getDate() + Math.round((Date.parse(date + 'T00:00:00Z') - origin) / 86400000));
    return [localDateKey(shifted), days[date]];
  }));
}

/** AI responses predate portions: retain manual choices for matching meals. */
export function retainMealDetails(previous: MealPlan['days'], next: MealPlan['days']): MealPlan['days'] {
  return Object.fromEntries(Object.entries(next).map(([date, day]) => [date, {
    meals: day.meals.map(meal => {
      const old = previous[date]?.meals.find(m => m.recipeId === meal.recipeId && m.label === meal.label)
        ?? previous[date]?.meals.find(m => m.recipeId === meal.recipeId)
        ?? previous[date]?.meals.find(m => m.label === meal.label);
      return { ...meal, servings: meal.servings ?? old?.servings, slot: meal.slot ?? (old?.label === meal.label ? old.slot : undefined) };
    }),
  }]));
}
