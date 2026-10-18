import type { Category } from '@/types';
import { localRecipeImages } from './localImages';

/**
 * Photos des recettes : uniquement les photos vérifiées intégrées à l'app (constants/localImages.ts,
 * générées par `npm run photos` depuis scripts/recipe-photos.json, crédits dans constants/photoCredits.ts).
 * Un plat sans photo fiable n'a PAS de photo (décision de LN, 18 oct. 2026 : pas de fausse image) :
 * il affiche le placeholder de sa catégorie et passe en fin de liste (photosFirst).
 */

/** Le plat a-t-il une vraie photo ? */
export function hasRecipePhoto(id: string): boolean {
  return localRecipeImages[id] !== undefined;
}

/** Photo d'une recette (require natif sur mobile, chemin public sur le web), ou null : placeholder. */
export function getRecipeImage(id: string, _category?: Category): (typeof localRecipeImages)[string] | null {
  return localRecipeImages[id] ?? null;
}

/**
 * Met les recettes sans photo à la fin, sans changer l'ordre à l'intérieur de chaque groupe (tri stable).
 * Une recette de l'utilisateur compte comme « avec photo » seulement si elle a son imageUri.
 */
export function photosFirst<T extends { id: string; imageUri?: string | null }>(list: readonly T[]): T[] {
  const withPhoto = (r: T) => (r.imageUri ? true : hasRecipePhoto(r.id));
  return [...list.filter(withPhoto), ...list.filter((r) => !withPhoto(r))];
}
