// Versioned, bounded snapshot shared with WidgetKit. Never include documents or AI chats.
export type WidgetItem = { id: string; title: string; subtitle: string; detail: string; symbol: string; url: string; image: string };
export type WidgetPage = { title: string; subtitle: string; empty: string; url: string; symbol: string; items: WidgetItem[] };
export type WidgetSnapshot = { version: 1; updated: number; locale: 'fr' | 'en'; mode: string; palette: string; brand: string; light: { bg: string; card: string; ink: string; muted: string; accent: string; soft: string }; dark: WidgetSnapshot['light']; days: Record<string, Record<string, WidgetPage>> };
export function dateKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function futureDays(now = new Date()): Date[] { return Array.from({length: 8}, (_,i) => new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12)); }
export function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(0,100) : []; }
export function pageFor(snapshot: WidgetSnapshot, kind: string, date = new Date()): WidgetPage {
 const day = snapshot.days[dateKey(date)];
 return day?.[kind] ?? { title: snapshot.brand, subtitle: '', empty: snapshot.locale === 'en' ? 'Open the app to refresh your widgets' : 'Ouvrez l’app pour actualiser vos widgets', url: 'tchope://', symbol: 'arrow.clockwise', items: [] };
}
