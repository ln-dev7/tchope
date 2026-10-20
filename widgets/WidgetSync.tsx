import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { syncWidgets } from './sync';
export default function WidgetSync() {
 useEffect(() => {
  if (Platform.OS === 'web') return;
  const initial = setTimeout(() => { void syncWidgets(); }, 1500);
  const interval = setInterval(() => { if (AppState.currentState === 'active') void syncWidgets(); }, 15000);
  const sub = AppState.addEventListener('change', () => { void syncWidgets(); });
  return () => { clearTimeout(initial); clearInterval(interval); sub.remove(); };
 }, []);
 return null;
}
