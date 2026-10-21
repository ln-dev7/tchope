import { recipes } from '../data/recipes';
import { recipesEn } from '../data/recipes-en';
import { resolveColors } from '../constants/themes';
import { hasRecipePhoto } from '../constants/images';
import { CATEGORY_KEYS } from '../constants/categories';
import { translations } from '../constants/translations';
import type { MealPlan } from '../context/MealPlannerContext';
import { buildShoppingList, type ShoppingSelection } from '../utils/shopping-list';
import { readStored } from './storage';
import { futureDays, dateKey, strings, type WidgetSnapshot, type WidgetItem, type WidgetPage } from './model';
export async function buildSnapshot(now = new Date()): Promise<WidgetSnapshot> {
 const settings=await readStored<{language?:string; theme?:string; palette?:string}>('tchope_settings',{});
 const en=settings.language==='en'; const locale=en?'en':'fr';
 const all=recipes.map(r=>({...r,...(en?{name:recipesEn[r.id]?.name||r.name,ingredients:r.ingredients.map((i,n)=>({...i,name:recipesEn[r.id]?.ingredients?.[n]?.name||i.name}))}:{})}));
 const map=Object.fromEntries(all.map(r=>[r.id,r])); const baseMap=Object.fromEntries(recipes.map(r=>[r.id,r]));
 const recipe=(id:string,subtitle?:string):WidgetItem|null=>{const r=map[id];return r?{id,title:r.name,subtitle:subtitle||translations[locale][CATEGORY_KEYS[r.category]],detail:`${r.duration} min`,url:`tchope://recipe/${encodeURIComponent(id)}`,symbol:'fork.knife',image:hasRecipePhoto(id)?`asset:${id}`:''}:null;};
 const favorites=strings(await readStored('tchope_favorites',[])).map(id=>recipe(id)).filter((r):r is WidgetItem=>!!r).slice(0,6);
 const pool=all.filter(r=>hasRecipePhoto(r.id));
 const rawPlan=await readStored<MealPlan|null>('tchope_meal_plan',null);
 const plan=rawPlan && typeof rawPlan.endDate==='string' && rawPlan.days && typeof rawPlan.days==='object' ? rawPlan : null;
 const shopping=await readStored<{selections:ShoppingSelection[];checked:string[]}>('tchope_shopping_v1',{selections:[],checked:[]});
 const days:WidgetSnapshot['days']={};
 for(const date of futureDays(now)) {
  const key=dateKey(date),index=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  const validPlan=plan && plan.endDate>=key ? plan:null;
  const slots=validPlan?.days[key]?.meals;
  const meals=(Array.isArray(slots)?slots:[]).filter(m=>m && typeof m.recipeId==='string').slice(0,5).map(m=>recipe(m.recipeId,m.slot ? ({breakfastMeal:en?'Breakfast':'Petit-déjeuner',lunchMeal:en?'Lunch':'Déjeuner',dinnerMeal:en?'Dinner':'Dîner'}[m.slot]) : m.label)).filter((r):r is WidgetItem=>!!r);
  let list:WidgetItem[]=[];
  try { list=buildShoppingList(validPlan,Array.isArray(shopping.selections)?shopping.selections:[],map,baseMap).filter(i=>!strings(shopping.checked).includes(i.key)).slice(0,8).map(i=>({id:i.key,title:i.name,subtitle:i.quantity,detail:'',url:'tchope://shopping-list',symbol:'basket.fill',image:''})); } catch { /* Invalid legacy plan: keep the rest of the widgets useful. */ }
  const page=(title:string,subtitle:string,empty:string,url:string,symbol:string,items:WidgetItem[]):WidgetPage=>({title,subtitle,empty,url,symbol,items});
  days[key]={
   discover:page(en?'On the menu today':'Au menu aujourd’hui',en?'A TASTE OF CAMEROON':'LE GOÛT DU CAMEROUN',en?'Find your next recipe':'Trouvez votre prochaine recette','tchope://search','fork.knife',pool.length?[recipe(pool[index%pool.length].id)!]:[]),
   favorites:page(en?'Your recipe book':'Votre carnet gourmand',en?'SAVED WITH LOVE':'VOS RECETTES PRÉFÉRÉES',en?'Save your favourite recipes':'Enregistrez vos recettes préférées','tchope://cookbook','heart.fill',favorites),
   agenda:page(en?'Today’s menu':'À table aujourd’hui',en?'YOUR MEAL PLAN':'VOTRE PLANNING',en?'Plan a meal in Tchopé':'Ajoutez un repas à votre planning','tchope://planner','calendar',meals),
   shopping:page(en?'At the market':'Au marché',en?'YOUR SHOPPING LIST':'VOTRE LISTE DE COURSES',en?'Your shopping list is ready for new recipes':'Ajoutez une recette à votre liste de courses','tchope://shopping-list','basket.fill',list),
   shortcuts:page(en?'What shall we cook?':'On cuisine quoi ?',en?'YOUR KITCHEN ESSENTIALS':'VOS ESSENTIELS CUISINE','','tchope://','fork.knife',[
    {id:'search',title:en?'Recipes':'Recettes',subtitle:en?'Find inspiration':'Trouvez l’inspiration',detail:'',url:'tchope://search',symbol:'magnifyingglass',image:''},
    {id:'plan',title:en?'My plan':'Mon planning',subtitle:en?'Prepare your week':'Préparez votre semaine',detail:'',url:'tchope://planner',symbol:'calendar',image:''},
    {id:'ai',title:'TchopAI',subtitle:en?'Ask your kitchen assistant':'Votre assistant cuisine',detail:'',url:'tchope://tchop-ai',symbol:'sparkles',image:''}
   ])
  };
 }
 const palette=settings.palette||'terre';const color=(dark:boolean)=>{const c=resolveColors(palette,dark);return{bg:c.background,card:c.card,ink:c.text,muted:c.textSecondary,accent:c.accent,soft:c.accentSoft};};
 return{version:1,updated:now.getTime()/1000,locale,mode:settings.theme||'system',palette,brand:'Tchopé',light:color(false),dark:color(true),days};
}
