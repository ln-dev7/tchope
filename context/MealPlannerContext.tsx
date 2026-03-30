import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAN_KEY = 'tchope_meal_plan';
const SAVED_PLANS_KEY = 'tchope_saved_meal_plans';

export type MealSlot = {
  label: string; // "Petit-déj", "Déjeuner", "Dîner", etc.
  recipeId: string;
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
  isLoaded: false,
});

export function useMealPlanner() {
  return useContext(MealPlannerContext);
}

function generatePlanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function isPlanExpired(plan: MealPlan): boolean {
  const end = new Date(plan.endDate);
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
    const dayKeys = Object.keys(plan.days).sort();
    const newDays: Record<string, DayPlan> = {};

    dayKeys.forEach((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      newDays[key] = plan.days[dayKeys[i]];
    });

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + dayKeys.length - 1);

    const newPlan: MealPlan = {
      id: generatePlanId(),
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
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

  return (
    <MealPlannerContext.Provider
      value={{
        currentPlan, savedPlans, setCurrentPlan, savePlan,
        deleteSavedPlan, reusePlan, resetPlan, swapMeal, isLoaded,
      }}>
      {children}
    </MealPlannerContext.Provider>
  );
}
