import type { Recipe, UserRecipe, Note, NoteBlock, NoteBlockType } from '@/types';
import type { MealPlan } from '@/context/MealPlannerContext';
import { noteToPlainText } from '@/components/notes/utils';
import { SYSTEM_PROMPT_FR, SYSTEM_PROMPT_EN } from './constants';

// Parse a multi-line content string into NoteBlocks based on simple prefixes.
// Used when TchopAI returns a note via [SAVE_NOTE:{title, content}].
function contentToBlocks(content: string): NoteBlock[] {
  const lines = content.split('\n');
  const blocks: NoteBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed && blocks.length === 0) continue;

    let type: NoteBlockType = 'paragraph';
    let text = trimmed;
    let checked: boolean | undefined;

    if (/^##\s+/.test(trimmed)) {
      type = 'heading2';
      text = trimmed.replace(/^##\s+/, '');
    } else if (/^#\s+/.test(trimmed)) {
      type = 'heading1';
      text = trimmed.replace(/^#\s+/, '');
    } else if (/^\[\s?[xX]\s?\]\s+/.test(trimmed)) {
      type = 'checklist';
      checked = true;
      text = trimmed.replace(/^\[\s?[xX]\s?\]\s+/, '');
    } else if (/^\[\s?\]\s+/.test(trimmed)) {
      type = 'checklist';
      checked = false;
      text = trimmed.replace(/^\[\s?\]\s+/, '');
    } else if (/^[-•]\s+/.test(trimmed)) {
      type = 'bullet';
      text = trimmed.replace(/^[-•]\s+/, '');
    } else if (/^\d+\.\s+/.test(trimmed)) {
      type = 'numbered';
      text = trimmed.replace(/^\d+\.\s+/, '');
    }

    blocks.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: text,
      ...(type === 'checklist' ? { checked: checked ?? false } : {}),
    });
  }
  if (blocks.length === 0) {
    blocks.push({
      id: `${Date.now()}-empty`,
      type: 'paragraph',
      content: '',
    });
  }
  return blocks;
}

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
  notes: Note[] = [],
): {
  content: string;
  recipeIds: string[];
  saveRecipe?: UserRecipe;
  noteIds: string[];
  saveNote?: Note;
} {
  let remaining = text;
  let saveRecipe: UserRecipe | undefined;
  let saveNote: Note | undefined;

  // [SAVE_RECIPE:{...}] — must be at the end of the response
  const saveRecipeMatch = remaining.match(/\[SAVE_RECIPE:(\{[\s\S]*?\})\]\s*$/);
  if (saveRecipeMatch) {
    remaining = remaining.slice(0, remaining.lastIndexOf('[SAVE_RECIPE:')).trimEnd();
    try {
      const parsed = JSON.parse(saveRecipeMatch[1]);
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

  // [SAVE_NOTE:{title,content}] — content is a multi-line string parsed into blocks
  const saveNoteMatch = remaining.match(/\[SAVE_NOTE:(\{[\s\S]*?\})\]\s*$/);
  if (saveNoteMatch) {
    remaining = remaining.slice(0, remaining.lastIndexOf('[SAVE_NOTE:')).trimEnd();
    try {
      const parsed = JSON.parse(saveNoteMatch[1]);
      const now = new Date().toISOString();
      saveNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: typeof parsed.title === 'string' ? parsed.title : '',
        blocks: contentToBlocks(typeof parsed.content === 'string' ? parsed.content : ''),
        createdAt: now,
        updatedAt: now,
      };
    } catch {}
  }

  // [RECIPES:id1,id2,...] — at end
  let recipeIds: string[] = [];
  const recipesMatch = remaining.match(/\[RECIPES:\s*([^\]]+)\]\s*$/);
  if (recipesMatch) {
    remaining = remaining.slice(0, remaining.lastIndexOf('[RECIPES:')).trimEnd();
    recipeIds = recipesMatch[1]
      .split(',')
      .map((id) => id.trim())
      .filter((id) => recipes.some((r) => r.id === id));
  }

  // [NOTES:id1,id2,...] — at end
  let noteIds: string[] = [];
  const notesMatch = remaining.match(/\[NOTES:\s*([^\]]+)\]\s*$/);
  if (notesMatch) {
    remaining = remaining.slice(0, remaining.lastIndexOf('[NOTES:')).trimEnd();
    noteIds = notesMatch[1]
      .split(',')
      .map((id) => id.trim())
      .filter((id) => notes.some((n) => n.id === id));
  }

  return {
    content: stripMarkdown(remaining),
    recipeIds,
    saveRecipe,
    noteIds,
    saveNote,
  };
}

export function buildSystemPrompt(
  recipes: Recipe[],
  userRecipes: UserRecipe[],
  favorites: string[],
  currentPlan: MealPlan | null,
  isFr: boolean,
  notes: Note[] = [],
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

  // Notes — include the ID so the AI can reference them via [NOTES:id1,...]
  const nonEmptyNotes = notes.filter((n) => n.title.trim() || n.blocks.some((b) => b.content.trim()));
  if (nonEmptyNotes.length > 0) {
    const noteBlocks = nonEmptyNotes.slice(0, 30).map((n) => {
      const title = n.title.trim() || (isFr ? 'Sans titre' : 'Untitled');
      const body = noteToPlainText(n);
      return `[${n.id}] ${title}\n${body}`;
    }).join('\n\n');
    sections.push(isFr
      ? `NOTES PERSONNELLES DE L'UTILISATEUR (ses pense-bêtes et idées, utilise leur ID exact pour les référencer avec [NOTES:id1,id2]) :\n${noteBlocks}`
      : `USER'S PERSONAL NOTES (their reminders and ideas, use their exact ID to reference them with [NOTES:id1,id2]):\n${noteBlocks}`);
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
