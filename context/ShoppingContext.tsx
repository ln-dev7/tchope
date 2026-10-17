import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShoppingSelection } from '../utils/shopping-list';

const KEY = 'tchope_shopping_v1';
type State = { selections: ShoppingSelection[]; checked: string[] };
const EMPTY: State = { selections: [], checked: [] };
type ShoppingContextValue = State & {
  isLoaded: boolean;
  error: boolean;
  addRecipe: (recipeId: string, servings: number) => void;
  removeRecipe: (id: string) => void;
  toggle: (key: string) => void;
  clearChecked: () => void;
  clearAll: () => Promise<void>;
};
const Context = createContext<ShoppingContextValue | null>(null);

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [isLoaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const writes = useRef(Promise.resolve());
  const hydrated = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) {
        const value = JSON.parse(raw);
        if (!Array.isArray(value.selections) || !Array.isArray(value.checked)) throw new Error('Invalid shopping data');
        setState(value);
      }
      hydrated.current = true;
    }).catch(() => setError(true)).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!isLoaded || !hydrated.current) return;
    // Serialize writes so a slow write cannot replace a more recent checkbox change.
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(state)))
      .then(() => setError(false)).catch(() => setError(true));
  }, [state, isLoaded]);
  return <Context.Provider value={{ ...state, isLoaded, error,
    addRecipe: (recipeId, servings) => {
      if (!isLoaded) return;
      hydrated.current = true;
      setState(prev => ({ ...prev, selections: [...prev.selections, {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, recipeId, servings,
      }] }));
    },
    removeRecipe: id => setState(prev => ({ ...prev, selections: prev.selections.filter(s => s.id !== id) })),
    toggle: key => setState(prev => ({ ...prev, checked: prev.checked.includes(key) ? prev.checked.filter(k => k !== key) : [...prev.checked, key] })),
    clearChecked: () => setState(prev => ({ ...prev, checked: [] })),
    clearAll: async () => { setState(EMPTY); await writes.current; await AsyncStorage.removeItem(KEY); },
  }}>{children}</Context.Provider>;
}
export function useShopping() {
  const value = useContext(Context);
  if (!value) throw new Error('ShoppingProvider is missing');
  return value;
}
