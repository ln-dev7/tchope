import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRecipe } from '@/types';

const USER_RECIPES_KEY = 'tchope_user_recipes';

type UserRecipesContextType = {
  userRecipes: UserRecipe[];
  addRecipe: (recipe: UserRecipe) => void;
  updateRecipe: (id: string, recipe: UserRecipe) => void;
  deleteRecipe: (id: string) => void;
  clearAll: () => void;
};

const UserRecipesContext = createContext<UserRecipesContextType>({
  userRecipes: [],
  addRecipe: () => {},
  updateRecipe: () => {},
  deleteRecipe: () => {},
  clearAll: () => {},
});

export function UserRecipesProvider({ children }: { children: React.ReactNode }) {
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(USER_RECIPES_KEY).then((raw) => {
      if (raw) {
        try { setUserRecipes(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const addRecipe = useCallback((recipe: UserRecipe) => {
    setUserRecipes((prev) => {
      const next = [...prev, recipe];
      AsyncStorage.setItem(USER_RECIPES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRecipe = useCallback((id: string, recipe: UserRecipe) => {
    setUserRecipes((prev) => {
      const next = prev.map((r) => (r.id === id ? recipe : r));
      AsyncStorage.setItem(USER_RECIPES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setUserRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(USER_RECIPES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setUserRecipes([]);
    AsyncStorage.removeItem(USER_RECIPES_KEY);
  }, []);

  return (
    <UserRecipesContext.Provider value={{ userRecipes, addRecipe, updateRecipe, deleteRecipe, clearAll }}>
      {children}
    </UserRecipesContext.Provider>
  );
}

export function useUserRecipes() {
  return useContext(UserRecipesContext);
}
