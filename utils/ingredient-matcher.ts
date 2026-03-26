import type { Recipe } from '@/types';

// ── Result type ─────────────────────────────────────────────────────────

export type MatchResult = {
  id: string;
  match: number;
  matched: string[];
  missing: string[];
  reason: string;
};

// ── Text normalization ──────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, ' ')
    .replace(/[()\/,.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'de', 'd', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'au', 'aux',
  'et', 'ou', 'a', 'en', 'pour', 'par', 'avec', 'sans', 'sur',
  'the', 'of', 'and', 'or', 'for', 'with', 'without', 'on',
  'selon', 'besoin', 'gout', 'qualite', 'frais', 'fraiche', 'bon', 'bonne',
  'grand', 'grande', 'petit', 'petite', 'gros', 'grosse', 'bien',
]);

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

// ── Synonym groups ──────────────────────────────────────────────────────

const SYNONYM_GROUPS: string[][] = [
  // Légumineuses
  ['haricot', 'haricots', 'cornille', 'cornilles', 'niebe', 'koki', 'bean', 'beans', 'cowpea'],
  ['arachide', 'arachides', 'cacahuete', 'cacahuetes', 'peanut', 'groundnut', 'pistache'],
  ['soja', 'soya'],
  // Tubercules & féculents
  ['manioc', 'cassava', 'bobolo', 'miondo', 'batons'],
  ['plantain', 'plantains'],
  ['igname', 'ignames', 'yam'],
  ['macabo', 'macabos', 'taro', 'cocoyam'],
  ['patate', 'patates', 'potato', 'potatoes'],
  // Viandes
  ['poulet', 'chicken', 'cuisses', 'ailes', 'volaille'],
  ['boeuf', 'beef', 'viande', 'veau'],
  ['porc', 'pork', 'cochon'],
  ['agneau', 'lamb', 'mouton'],
  ['chevre', 'goat'],
  // Poissons & fruits de mer
  ['poisson', 'fish', 'bar', 'maquereau', 'carpe', 'tilapia', 'capitaine', 'sole', 'cabillaud', 'sardine', 'merlan', 'silure', 'machoiron'],
  ['crevette', 'crevettes', 'shrimp', 'crayfish', 'ecrevisse', 'ecrevisses', 'gambas'],
  ['crabe', 'crabes', 'crab'],
  ['morue', 'stockfish', 'bacalhau'],
  // Légumes
  ['tomate', 'tomates', 'tomato', 'tomatoes'],
  ['oignon', 'oignons', 'onion', 'echalote'],
  ['ail', 'garlic'],
  ['carotte', 'carottes', 'carrot'],
  ['chou', 'choux', 'cabbage'],
  ['gombo', 'gombos', 'okra'],
  ['piment', 'piments', 'pepper', 'chili', 'habanero'],
  ['poivron', 'poivrons', 'bell'],
  ['aubergine', 'aubergines', 'eggplant'],
  ['courgette', 'courgettes', 'zucchini'],
  ['concombre', 'concombres', 'cucumber'],
  ['epinard', 'epinards', 'spinach'],
  ['laitue', 'lettuce'],
  ['avocat', 'avocats', 'avocado'],
  ['mais', 'corn', 'maize'],
  ['champignon', 'champignons', 'mushroom'],
  // Feuilles camerounaises
  ['ndole', 'bitterleaf', 'vernonia'],
  ['eru', 'okok', 'fumbwa'],
  ['njama', 'huckleberry'],
  ['folong', 'morelle', 'nightshade'],
  ['zom', 'feuilles', 'leaves'],
  // Épices & aromates
  ['gingembre', 'ginger', 'djindja'],
  ['curcuma', 'turmeric'],
  ['cumin', 'cummin'],
  ['persil', 'parsley'],
  ['basilic', 'basil'],
  ['thym', 'thyme'],
  ['laurier', 'bay'],
  ['coriandre', 'cilantro', 'coriander'],
  ['muscade', 'nutmeg'],
  // Huiles spécifiques
  ['palme', 'palm', 'rouge'],
  ['olive', 'olives'],
  ['sesame', 'tahini'],
  // Fruits
  ['citron', 'lemon', 'lime', 'limette'],
  ['orange', 'oranges'],
  ['mangue', 'mangues', 'mango'],
  ['ananas', 'pineapple'],
  ['coco', 'coconut', 'noix'],
  ['papaye', 'papaya'],
  ['banane', 'bananes', 'banana'],
  // Produits laitiers & oeufs
  ['oeuf', 'oeufs', 'egg', 'eggs'],
  ['lait', 'milk', 'creme'],
  ['fromage', 'cheese'],
  ['yaourt', 'yogurt', 'yoghurt'],
  ['beurre', 'butter', 'margarine'],
  // Céréales
  ['riz', 'rice'],
  ['farine', 'flour'],
  ['semoule', 'semolina', 'couscous'],
  ['mil', 'millet', 'sorgho'],
  // Condiments & autres
  ['sucre', 'sugar'],
  ['miel', 'honey'],
  ['vinaigre', 'vinegar'],
  ['moutarde', 'mustard'],
  ['concentre', 'puree', 'pate', 'paste'],
  ['fumee', 'fume', 'smoked', 'seche'],
];

const synonymMap = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, idx) => {
  group.forEach((token) => synonymMap.set(token, idx));
});

function getSynonymGroup(token: string): number {
  const exact = synonymMap.get(token);
  if (exact !== undefined) return exact;
  for (const [key, groupIdx] of synonymMap) {
    if ((token.length >= 4 && key.length >= 4) && (token.startsWith(key) || key.startsWith(token))) {
      return groupIdx;
    }
  }
  return -1;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
  }
  const ga = getSynonymGroup(a);
  const gb = getSynonymGroup(b);
  return ga >= 0 && ga === gb;
}

function ingredientMatches(userTokens: string[], recipeIngredient: string): boolean {
  const recipeTokens = tokenize(recipeIngredient);
  for (const ut of userTokens) {
    for (const rt of recipeTokens) {
      if (tokensMatch(ut, rt)) return true;
    }
  }
  return false;
}

// ── Generic ingredient detection ────────────────────────────────────────

const GENERIC_TOKENS = new Set([
  'sel', 'salt', 'poivre', 'pepper', 'eau', 'water',
  'cube', 'maggi', 'bouillon', 'broth', 'stock',
]);

function isGeneric(name: string): boolean {
  const n = normalize(name);
  if (n.includes('palme') || n.includes('palm')) return false;
  if (n.includes('arachide') || n.includes('peanut')) return false;
  if (n.includes('olive') || n.includes('sesame') || n.includes('coco')) return false;
  const tokens = tokenize(name);
  return tokens.length > 0 && tokens.every((t) => GENERIC_TOKENS.has(t));
}

// ── Scoring ─────────────────────────────────────────────────────────────

const BASE_WEIGHT = 0.6;
const SEC_WEIGHT = 0.4;

export function searchByIngredients(
  recipes: Recipe[],
  userIngredients: string[],
  isFr: boolean,
): MatchResult[] {
  const userTokenSets = userIngredients.map((ing) => tokenize(ing));
  const results: MatchResult[] = [];

  for (const recipe of recipes) {
    const nonGeneric = recipe.ingredients.filter((ing) => !isGeneric(ing.name));
    if (nonGeneric.length === 0) continue;

    const baseCount = Math.min(2, nonGeneric.length);

    let baseMatched = 0;
    let secMatched = 0;
    const matched: string[] = [];
    const missing: string[] = [];

    for (let i = 0; i < nonGeneric.length; i++) {
      const ing = nonGeneric[i];
      const isMatch = userTokenSets.some((tokens) => ingredientMatches(tokens, ing.name));
      if (isMatch) {
        if (i < baseCount) baseMatched++;
        else secMatched++;
        matched.push(ing.name);
      } else {
        missing.push(ing.name);
      }
    }

    if (matched.length === 0) continue;

    const secTotal = nonGeneric.length - baseCount;
    const baseScore = baseCount > 0 ? baseMatched / baseCount : 0;
    const secScore = secTotal > 0 ? secMatched / secTotal : 0;
    const score = Math.round((baseScore * BASE_WEIGHT + secScore * SEC_WEIGHT) * 100);

    if (score < 15) continue;

    const reason = missing.length === 0
      ? (isFr ? 'Vous avez tous les ingrédients principaux' : 'You have all the main ingredients')
      : (isFr ? `Manque : ${missing.slice(0, 3).join(', ')}` : `Missing: ${missing.slice(0, 3).join(', ')}`);

    results.push({ id: recipe.id, match: score, matched, missing, reason });
  }

  return results.sort((a, b) => b.match - a.match).slice(0, 15);
}

// ── Missing ingredients for a recipe ─────────────────────────────────────

export function getMissingIngredients(
  recipe: Recipe,
  userIngredients: string[],
): string[] {
  const userTokenSets = userIngredients.map((ing) => tokenize(ing));
  return recipe.ingredients
    .filter((ing) => !isGeneric(ing.name))
    .filter((ing) => !userTokenSets.some((tokens) => ingredientMatches(tokens, ing.name)))
    .map((ing) => ing.name);
}

// ── Validation ──────────────────────────────────────────────────────────

export function isValidIngredient(text: string, knownIngredients: Set<string>): boolean {
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length < 2) return false;

  for (const known of knownIngredients) {
    if (known.includes(cleaned) || cleaned.includes(known.split(' ')[0])) {
      return true;
    }
  }

  const tokens = tokenize(text);
  if (tokens.some((t) => getSynonymGroup(t) >= 0)) return true;

  const foodPatterns = [
    /^(sel|poivre|sucre|huile|beurre|farine|riz|eau|lait|oeuf|œuf)/i,
    /^(salt|pepper|sugar|oil|butter|flour|rice|water|milk|egg)/i,
    /^(tomat|oignon|ail|carott|pomme|citron|banane|avocat|chou|patate)/i,
    /^(tomato|onion|garlic|carrot|apple|lemon|banana|avocado|cabbage|potato)/i,
    /^(poulet|boeuf|bœuf|porc|poisson|crevette|viande|agneau)/i,
    /^(chicken|beef|pork|fish|shrimp|meat|lamb)/i,
    /^(haricot|piment|gingembre|persil|basilic|thym|laurier|cumin)/i,
    /^(bean|chili|ginger|parsley|basil|thyme|bay|cumin)/i,
    /^(manioc|plantain|igname|ndolé|gombo|arachide|macabo|taro)/i,
    /^(cassava|yam|okra|peanut|cocoyam)/i,
  ];
  return foodPatterns.some((p) => p.test(cleaned));
}
