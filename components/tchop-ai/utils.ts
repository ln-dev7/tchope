import type { Recipe, UserRecipe } from '@/types';
import type { MealPlan } from '@/context/MealPlannerContext';
import { SYSTEM_PROMPT_FR, SYSTEM_PROMPT_EN } from './constants';

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\-\*]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '• ');
}

export function parseResponse(
  text: string,
  recipes: Recipe[],
): { content: string; recipeIds: string[]; saveRecipe?: UserRecipe } {
  let remaining = text;
  let saveRecipe: UserRecipe | undefined;

  const saveMatch = remaining.match(/\[SAVE_RECIPE:(\{[\s\S]*\})\]\s*$/);
  if (saveMatch) {
    remaining = remaining.slice(0, remaining.lastIndexOf('[SAVE_RECIPE:')).trimEnd();
    try {
      const parsed = JSON.parse(saveMatch[1]);
      saveRecipe = {
        ...parsed,
        id: 'user-' + Date.now(),
        image: null,
        region: 'TchopAI',
        rating: 0,
        isUserCreated: true,
        createdAt: new Date().toISOString(),
      };
    } catch {}
  }

  const match = remaining.match(/\[RECIPES:\s*([^\]]+)\]\s*$/);
  if (!match) return { content: stripMarkdown(remaining), recipeIds: [], saveRecipe };
  const content = remaining.slice(0, remaining.lastIndexOf('[RECIPES:')).trimEnd();
  const recipeIds = match[1]
    .split(',')
    .map((id) => id.trim())
    .filter((id) => recipes.some((r) => r.id === id));
  return { content: stripMarkdown(content), recipeIds, saveRecipe };
}

export function buildSystemPrompt(
  recipes: Recipe[],
  userRecipes: UserRecipe[],
  favorites: string[],
  currentPlan: MealPlan | null,
  isFr: boolean,
): string {
  const allRecipes = [...recipes, ...userRecipes];
  const recipeIndex = allRecipes
    .map((r) => `- [${r.id}] ${r.name} (${r.region}, ${r.category}, ${r.duration}min, ${r.difficulty}) : ${r.ingredients.map((i) => i.name).join(', ')}`)
    .join('\n');
  const template = isFr ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
  let prompt = template.replace('{RECIPES}', recipeIndex);

  const sections: string[] = [];

  // Cookbook
  const favNames = favorites
    .map((fid) => allRecipes.find((r) => r.id === fid)?.name)
    .filter(Boolean);
  const userRecipeNames = userRecipes.map((r) => r.name);
  if (favNames.length > 0 || userRecipeNames.length > 0) {
    const parts: string[] = [];
    if (favNames.length > 0) {
      parts.push(isFr
        ? `Favoris (${favNames.length}) : ${favNames.join(', ')}`
        : `Favorites (${favNames.length}): ${favNames.join(', ')}`);
    }
    if (userRecipeNames.length > 0) {
      parts.push(isFr
        ? `Recettes créées (${userRecipeNames.length}) : ${userRecipeNames.join(', ')}`
        : `Created recipes (${userRecipeNames.length}): ${userRecipeNames.join(', ')}`);
    }
    sections.push(isFr
      ? `COOKBOOK DE L'UTILISATEUR (ce sont les recettes dans son cookbook, tu y as accès) :\n${parts.join('\n')}`
      : `USER'S COOKBOOK (these are the recipes in their cookbook, you have access to them):\n${parts.join('\n')}`);
  }

  // Meal plan
  if (currentPlan) {
    const dayLines: string[] = [];
    const sortedDates = Object.keys(currentPlan.days).sort();
    const dayNames = isFr
      ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const date of sortedDates) {
      const day = currentPlan.days[date];
      const d = new Date(date + 'T00:00:00');
      const dayName = dayNames[d.getDay()];
      const meals = day.meals
        .map((m) => {
          const recipe = allRecipes.find((r) => r.id === m.recipeId);
          return recipe ? `${m.label}: ${recipe.name}` : null;
        })
        .filter(Boolean)
        .join(', ');
      if (meals) dayLines.push(`${dayName} ${date.slice(5)} — ${meals}`);
    }
    if (dayLines.length > 0) {
      const ingredientMap = new Map<string, Set<string>>();
      for (const date of sortedDates) {
        for (const meal of currentPlan.days[date].meals) {
          const recipe = allRecipes.find((r) => r.id === meal.recipeId);
          if (recipe) {
            for (const ing of recipe.ingredients) {
              const key = ing.name.toLowerCase();
              if (!ingredientMap.has(key)) ingredientMap.set(key, new Set());
              ingredientMap.get(key)!.add(ing.quantity);
            }
          }
        }
      }
      const shoppingLines = Array.from(ingredientMap.entries())
        .map(([name, quantities]) => `${name} (${Array.from(quantities).join(' + ')})`)
        .join(', ');

      sections.push(isFr
        ? `PLAN DE REPAS ACTUEL (${currentPlan.startDate} au ${currentPlan.endDate}) :\n${dayLines.join('\n')}${currentPlan.preferences ? `\nPréférences : ${currentPlan.preferences}` : ''}\n\nLISTE DE COURSES DU PLAN :\n${shoppingLines}`
        : `CURRENT MEAL PLAN (${currentPlan.startDate} to ${currentPlan.endDate}):\n${dayLines.join('\n')}${currentPlan.preferences ? `\nPreferences: ${currentPlan.preferences}` : ''}\n\nSHOPPING LIST FROM PLAN:\n${shoppingLines}`);
    }
  }

  // App features
  sections.push(isFr
    ? `FONCTIONNALITÉS DE L'APP TCHOPÉ :
L'app contient plus de 100 recettes camerounaises authentiques des 10 régions du Cameroun.
Écrans principaux : Accueil (recettes par région, mises en avant), Recherche (par nom, catégorie, niveau de piment, ingrédients), Planificateur de repas (plan hebdomadaire, génération IA, échange de repas, export PDF), Cookbook (favoris et recettes créées), Paramètres (thème, langue, notifications).
Autres fonctionnalités : Mode cuisine (étape par étape avec timer intégré, lecture vocale), TchopAI Live (assistant vocal temps réel pendant la cuisine, premium), Recherche par ingrédients disponibles (premium), Liste de courses (auto-générée depuis le plan, cocher les items, partager), Page minuteur (timers multiples, préréglages cuisine), Ajout de recettes personnelles, Vidéos de recettes YouTube.
Catégories : Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement.
Niveaux de piment : Doux, Moyen, Extra Piquant.
Difficulté : Facile, Moyen, Difficile.
Régions : Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest.
Tu peux guider l'utilisateur vers n'importe quelle fonctionnalité en lui expliquant comment y accéder.`
    : `TCHOPÉ APP FEATURES:
The app contains 100+ authentic Cameroonian recipes from all 10 regions.
Main screens: Home (recipes by region, featured), Search (by name, category, spice level, ingredients), Meal Planner (weekly plan, AI generation, meal swaps, PDF export), Cookbook (favorites and created recipes), Settings (theme, language, notifications).
Other features: Cooking Mode (step-by-step with built-in timer, voice reading), TchopAI Live (real-time voice assistant during cooking, premium), Search by available ingredients (premium), Shopping List (auto-generated from plan, check items, share), Timer page (multiple timers, cooking presets), Custom recipe creation, YouTube recipe videos.
Categories: Plat, Sauce, Grillade, Boisson, Dessert, Entrée, Accompagnement.
Spice levels: Mild, Medium, Extra Hot.
Difficulty: Easy, Medium, Hard.
Regions: Littoral, Ouest, Centre, Sud, Nord, Est, Adamaoua, Extrême-Nord, Nord-Ouest, Sud-Ouest.
You can guide the user to any feature by explaining how to access it.`);

  if (sections.length > 0) {
    prompt += '\n\n' + sections.join('\n\n');
  }

  return prompt;
}
