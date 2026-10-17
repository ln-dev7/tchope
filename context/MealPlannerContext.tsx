import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { appendMeal, removePlannedMeal, localDateKey, shiftPlanDays } from '../utils/meal-planning';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAN_KEY = 'tchope_meal_plan';
const SAVED_PLANS_KEY = 'tchope_saved_meal_plans';

export type MealSlot = {
  label: string; // "Petit-déj", "Déjeuner", "Dîner", etc.
  recipeId: string;
  servings?: number;
  slot?: 'breakfastMeal' | 'lunchMeal' | 'dinnerMeal';
};

export type DayPlan = {
  meals: MealSlot[];
};

export type MealPlan = {
  id: string;
  startDate: string;
  endDate: string;
  preferences: string;
  days: Record<string, DayPlan>; // key = YYYY-MM-DD
  createdAt: string;
};

type MealPlannerContextType = {
  currentPlan: MealPlan | null;
  savedPlans: MealPlan[];
  setCurrentPlan: (plan: MealPlan | null) => void;
  savePlan: () => void;
  deleteSavedPlan: (planId: string) => void;
  reusePlan: (plan: MealPlan) => void;
  resetPlan: () => void;
  swapMeal: (date: string, mealIndex: number, newRecipeId: string) => void;
  addMeal: (date: string, meal: MealSlot) => void;
  removeMeal: (date: string, index: number) => void;
  clearAll: () => Promise<void>;
  isLoaded: boolean;
};

const MealPlannerContext = createContext<MealPlannerContextType>({
  currentPlan: null,
  savedPlans: [],
  setCurrentPlan: () => {},
  savePlan: () => {},
  deleteSavedPlan: () => {},
  reusePlan: () => {},
  resetPlan: () => {},
  swapMeal: () => {},
  addMeal: () => {},
  removeMeal: () => {},
  clearAll: async () => {},
  isLoaded: false,
});

export function useMealPlanner() {
  return useContext(MealPlannerContext);
}

function generatePlanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function isPlanExpired(plan: MealPlan): boolean {
  const end = new Date(plan.endDate + 'T12:00:00');
  end.setHours(23, 59, 59, 999);
  return new Date() > end;
}

export function MealPlannerProvider({ children }: { children: React.ReactNode }) {
  const [currentPlan, setCurrentPlanState] = useState<MealPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MealPlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [planJson, savedJson] = await Promise.all([
          AsyncStorage.getItem(PLAN_KEY),
          AsyncStorage.getItem(SAVED_PLANS_KEY),
        ]);
        if (planJson) {
          const plan = JSON.parse(planJson) as MealPlan;
          if (isPlanExpired(plan)) {
            await AsyncStorage.removeItem(PLAN_KEY);
          } else {
            setCurrentPlanState(plan);
          }
        }
        if (savedJson) {
          setSavedPlans(JSON.parse(savedJson));
        }
      } catch {} finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setCurrentPlan = useCallback(async (plan: MealPlan | null) => {
    setCurrentPlanState(plan);
    if (plan) {
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } else {
      await AsyncStorage.removeItem(PLAN_KEY);
    }
  }, []);

  const savePlan = useCallback(async () => {
    if (!currentPlan) return;
    const updated = [...savedPlans.filter((p) => p.id !== currentPlan.id), currentPlan];
    setSavedPlans(updated);
    await AsyncStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(updated));
  }, [currentPlan, savedPlans]);

  const deleteSavedPlan = useCallback(async (planId: string) => {
    const updated = savedPlans.filter((p) => p.id !== planId);
    setSavedPlans(updated);
    await AsyncStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(updated));
  }, [savedPlans]);

  const reusePlan = useCallback((plan: MealPlan) => {
    const today = new Date();
    const newDays = shiftPlanDays(plan.days, today);
    const dates = Object.keys(newDays).sort();
    if (!dates.length) return;

    const newPlan: MealPlan = {
      id: generatePlanId(),
      startDate: localDateKey(today),
      endDate: dates[dates.length - 1],
      preferences: plan.preferences,
      days: newDays,
      createdAt: new Date().toISOString(),
    };

    setCurrentPlan(newPlan);
  }, [setCurrentPlan]);

  const resetPlan = useCallback(() => {
    setCurrentPlan(null);
  }, [setCurrentPlan]);

  const swapMeal = useCallback((date: string, mealIndex: number, newRecipeId: string) => {
    if (!currentPlan) return;
    const updatedDays = { ...currentPlan.days };
    const day = updatedDays[date];
    if (day && day.meals[mealIndex]) {
      const newMeals = [...day.meals];
      newMeals[mealIndex] = { ...newMeals[mealIndex], recipeId: newRecipeId };
      updatedDays[date] = { meals: newMeals };
    }
    setCurrentPlan({ ...currentPlan, days: updatedDays });
  }, [currentPlan, setCurrentPlan]);

  const addMeal = useCallback((date: string, meal: MealSlot) => {
    if (isLoaded) setCurrentPlan(appendMeal(currentPlan, date, meal));
  }, [currentPlan, isLoaded, setCurrentPlan]);
  const removeMeal = useCallback((date: string, index: number) => {
    if (currentPlan) setCurrentPlan(removePlannedMeal(currentPlan, date, index));
  }, [currentPlan, setCurrentPlan]);

  const clearAll = useCallback(async () => {
    setCurrentPlanState(null);
    setSavedPlans([]);
    await AsyncStorage.multiRemove([PLAN_KEY, SAVED_PLANS_KEY]);
  }, []);

  return (
    <MealPlannerContext.Provider
      value={{
        currentPlan, savedPlans, setCurrentPlan, savePlan,
        deleteSavedPlan, reusePlan, resetPlan, swapMeal, addMeal, removeMeal, clearAll, isLoaded,
      }}>
      {children}
    </MealPlannerContext.Provider>
  );
}
