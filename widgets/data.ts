'use no memo';
import { recipes } from '../data/recipes';
import { recipesEn } from '../data/recipes-en';
import { hasRecipePhoto } from '../constants/images';
export type WidgetRecipe = { id: string; name: string; region: string; duration: number; emoji: string; imageUrl: string };
/** Real app catalogue and the same local-day rotation as the widgets. */
export function getRecipeOfTheDay(date = new Date(), locale = 'fr'): WidgetRecipe {
 const pool = recipes.filter(r => hasRecipePhoto(r.id));
 const index = Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 const r = pool[index % pool.length] ?? recipes[0];
 return {id:r.id,name:locale==='en' ? recipesEn[r.id]?.name||r.name:r.name,region:r.region,duration:r.duration,emoji:'🍽️',imageUrl:''};
}
