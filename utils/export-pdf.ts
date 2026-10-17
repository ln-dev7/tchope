import { buildShoppingList } from './shopping-list';
import { translations } from '../constants/translations';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { MealPlan } from '@/context/MealPlannerContext';
import type { Recipe } from '@/types';

type ExportOptions = {
  plan: MealPlan;
  recipeMap: Record<string, Recipe>;
  lang: 'fr' | 'en';
  title: string;
  shoppingListTitle: string;
};

const FULL_DAY_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const FULL_DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
  const d = new Date(dateStr + 'T12:00:00');
  const names = lang === 'fr' ? FULL_DAY_FR : FULL_DAY_EN;
  const month = d.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
  return `${names[d.getDay()]} ${d.getDate()} ${month}`;
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function generateHTML({ plan, recipeMap, lang, title, shoppingListTitle }: ExportOptions): string {
  const sortedDays = Object.keys(plan.days).sort();

  const daysHTML = sortedDays.map((date) => {
    const day = plan.days[date];
    if (!day) return '';
    const mealsHTML = day.meals.map((meal) => {
      const recipe = recipeMap[meal.recipeId];
      const name = escapeHTML(recipe?.name ?? meal.recipeId);
      const meta = recipe ? `${recipe.region} · ${recipe.duration} min${meal.servings ? ` · ${meal.servings} ${translations[lang].portions}` : ''}` : '';
      return `
        <div class="meal">
          <span class="meal-label">${escapeHTML(meal.slot ? translations[lang][meal.slot] : meal.label)}</span>
          <span class="meal-name">${name}</span>
          <span class="meal-meta">${meta}</span>
        </div>`;
    }).join('');

    return `
      <div class="day">
        <div class="day-header">${formatDate(date, lang)}</div>
        ${mealsHTML}
      </div>`;
  }).join('');

  const shoppingHTML = buildShoppingList(plan, [], recipeMap, recipeMap)
    .map(item => `<li>${escapeHTML(item.name)} — ${escapeHTML(item.quantity)}</li>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color: #2F2F2E; padding: 40px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; color: #914700; }
    .subtitle { font-size: 14px; color: #888; margin-bottom: 32px; }
    .day { margin-bottom: 24px; }
    .day-header { font-size: 16px; font-weight: 700; color: #914700; padding: 8px 0; border-bottom: 2px solid #F3E8DC; margin-bottom: 8px; }
    .meal { display: flex; align-items: baseline; gap: 12px; padding: 6px 0; }
    .meal-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #914700; min-width: 70px; }
    .meal-name { font-size: 14px; font-weight: 600; color: #2F2F2E; }
    .meal-meta { font-size: 12px; color: #999; }
    h2 { font-size: 22px; font-weight: 700; color: #914700; margin-top: 40px; margin-bottom: 16px; page-break-before: always; }
    ul { list-style: none; columns: 2; column-gap: 32px; }
    li { font-size: 13px; padding: 4px 0; border-bottom: 1px solid #F3F0EF; }
    li::before { content: "☐ "; color: #914700; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #BBB; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">${formatDate(plan.startDate, lang)} → ${formatDate(plan.endDate, lang)}</div>
  ${daysHTML}
  <h2>${shoppingListTitle}</h2>
  <ul>${shoppingHTML}</ul>
  <div class="footer">Tchopé 🇨🇲 — tchope.lndev.me</div>
</body>
</html>`;
}

export async function exportMealPlanPDF(options: ExportOptions): Promise<void> {
  const html = generateHTML(options);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
