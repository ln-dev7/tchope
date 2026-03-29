'use no memo';

export type WidgetRecipe = {
  id: string;
  name: string;
  region: string;
  duration: number;
  emoji: string;
  imageUrl: string;
};

const FEATURED_RECIPES: WidgetRecipe[] = [
  { id: 'ndole', name: 'Ndolé', region: 'Littoral', duration: 120, emoji: '🍃', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Ndol%C3%A8_%C3%A0_la_viande%2C_morue_et_crevettes.jpg' },
  { id: 'poulet-dg', name: 'Poulet DG', region: 'Centre', duration: 90, emoji: '🍗', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG' },
  { id: 'eru', name: 'Eru', region: 'Sud-Ouest', duration: 60, emoji: '🥬', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg' },
  { id: 'mbongo-tchobi', name: 'Mbongo Tchobi', region: 'Littoral', duration: 120, emoji: '🐟', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg' },
  { id: 'koki', name: 'Koki', region: 'Ouest', duration: 240, emoji: '🫘', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg' },
  { id: 'taro-sauce-jaune', name: 'Taro Sauce Jaune', region: 'Ouest', duration: 90, emoji: '🥘', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Taro_sauce_jaune.jpg' },
  { id: 'kondre', name: 'Kondré', region: 'Ouest', duration: 120, emoji: '🍌', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Kondr%C3%A8_%C3%A0_la_viande_de_b%C5%93uf.png' },
  { id: 'sanga', name: 'Sanga', region: 'Centre', duration: 90, emoji: '🌽', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Sanga%2C_Plat_camerounais.jpg' },
  { id: 'okok-sucre', name: 'Okok Sucré', region: 'Centre', duration: 60, emoji: '🍃', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Ikok_mix%C3%A9_et_son_manioc_vapeur.jpg' },
  { id: 'poisson-braise', name: 'Poisson Braisé', region: 'Littoral', duration: 60, emoji: '🐠', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG' },
  { id: 'ekwang', name: 'Ekwang', region: 'Littoral', duration: 180, emoji: '🥬', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Ekwang.jpg' },
  { id: 'okok', name: 'Okok', region: 'Centre', duration: 45, emoji: '🍃', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Okok.jpg' },
  { id: 'bikedi', name: 'Bikedi', region: 'Sud', duration: 210, emoji: '🫘', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg' },
];

export function getRecipeOfTheDay(): WidgetRecipe {
  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % FEATURED_RECIPES.length;
  return FEATURED_RECIPES[dayIndex];
}
