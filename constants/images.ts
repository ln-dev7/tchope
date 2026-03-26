import type { Category } from '@/types';

// Wikimedia Commons images (CC license) - authentic Cameroonian dish photos
// Pexels/Unsplash used as fallbacks when no Wikimedia image exists
export const recipeImages: Record<string, string> = {
  // =================== FEATURED / POPULAR ===================
  ndole:
    "https://upload.wikimedia.org/wikipedia/commons/9/91/Ndol%C3%A8_%C3%A0_la_viande%2C_morue_et_crevettes.jpg",
  "poulet-dg":
    "https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG",
  eru: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg",
  kondre:
    "https://upload.wikimedia.org/wikipedia/commons/9/9a/Kondr%C3%A8_%C3%A0_la_viande_de_b%C5%93uf.png",
  koki: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg",
  okok: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Okok.jpg",
  "okok-sale": "https://upload.wikimedia.org/wikipedia/commons/1/1d/Okok.jpg",
  "poisson-braise":
    "https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG",

  // =================== SAUCES ===================
  "mbongo-tchobi":
    "https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg",
  "sauce-gombo":
    "https://upload.wikimedia.org/wikipedia/commons/4/41/Okro_soup.jpg",
  "gombo-boeuf":
    "https://upload.wikimedia.org/wikipedia/commons/4/41/Okro_soup.jpg",
  "gombo-crabe":
    "https://upload.wikimedia.org/wikipedia/commons/4/41/Okro_soup.jpg",
  "sauce-darachide":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Fufu_accompagn%C3%A9_d%27une_sauce_arachide_au_poulet.JPG",
  "sauce-arachide":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Fufu_accompagn%C3%A9_d%27une_sauce_arachide_au_poulet.JPG",
  nkui: "https://upload.wikimedia.org/wikipedia/commons/5/53/Nkui.jpg",
  egusi:
    "https://upload.wikimedia.org/wikipedia/commons/7/72/Eba_and_Egusi_soup.JPG",
  ndomba:
    "https://upload.wikimedia.org/wikipedia/commons/1/1c/Ndomba_de_poulet.jpg",
  "ndomba-de-bar":
    "https://upload.wikimedia.org/wikipedia/commons/1/1c/Ndomba_de_poulet.jpg",
  "ndomba-de-porc":
    "https://upload.wikimedia.org/wikipedia/commons/1/1c/Ndomba_de_poulet.jpg",

  // =================== GRILLADES ===================
  soya: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Suya_meat_in_Northern_Nigeria.jpg",
  kilishi:
    "https://upload.wikimedia.org/wikipedia/commons/9/91/%22Kilishi%22.JPG",

  // =================== ENTRÉES / SALADES ===================
  "salade-avocat":
    "https://upload.wikimedia.org/wikipedia/commons/a/a2/Salade_avocat_01.jpg",
  "salade-d-avocat":
    "https://upload.wikimedia.org/wikipedia/commons/a/a2/Salade_avocat_01.jpg",
  "salade-de-fruits-exotiques":
    "https://upload.wikimedia.org/wikipedia/commons/2/2e/Tropical_fruit.jpg",
  "boulettes-de-viande":
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Boulettes_de_viande%2C_IKEA_Gen%C3%A8ve.jpg",
  "boulettes-de-poisson":
    "https://images.pexels.com/photos/390382/pexels-photo-390382.jpeg?auto=compress&cs=tinysrgb&w=600",

  // =================== ACCOMPAGNEMENTS ===================
  "plantain-frit":
    "https://upload.wikimedia.org/wikipedia/commons/0/04/Un_plat_d%27alloco_Fried_Plantains.JPG",
  "plantains-frits":
    "https://upload.wikimedia.org/wikipedia/commons/0/04/Un_plat_d%27alloco_Fried_Plantains.JPG",
  beignets:
    "https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg",
  "beignets-haricots":
    "https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg",
  "beignets-farine":
    "https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg",
  "beignets-farine-de-ble":
    "https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg",
  "beignets-de-mais":
    "https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg",
  fufu: "https://anideva.com/wp-content/uploads/2022/03/DSC02324-1024x768.jpg",
  "water-fufu":
    "https://anideva.com/wp-content/uploads/2022/03/DSC02324-1024x768.jpg",
  "foufou-de-manioc":
    "https://anideva.com/wp-content/uploads/2022/03/DSC02324-1024x768.jpg",
  "foufou-de-mais":
    "https://anideva.com/wp-content/uploads/2022/03/DSC02324-1024x768.jpg",
  miondo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Kwanga.jpg",
  bobolo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Kwanga.jpg",
  "baton-de-manioc":
    "https://upload.wikimedia.org/wikipedia/commons/4/45/Kwanga.jpg",
  "couscous-de-manioc":
    "https://upload.wikimedia.org/wikipedia/commons/b/b2/Couscous_de_mil_blanc_de_l%E2%80%99extr%C3%AAme_nord_du_Cameroun.jpg",
  "couscous-de-mais":
    "https://upload.wikimedia.org/wikipedia/commons/b/b2/Couscous_de_mil_blanc_de_l%E2%80%99extr%C3%AAme_nord_du_Cameroun.jpg",
  ekomba:
    "https://upload.wikimedia.org/wikipedia/commons/d/d8/Koki_and_ripe_plantains.jpg",

  // =================== PLATS PRINCIPAUX ===================
  ekwang: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Ekwang.jpg",
  "kati-kati":
    "https://upload.wikimedia.org/wikipedia/commons/6/68/Kati-kati.jpg",
  "njama-njama":
    "https://upload.wikimedia.org/wikipedia/commons/3/35/Fufu_corn_and_khati_khati.jpg",
  "crevettes-sauce-tomate":
    "https://upload.wikimedia.org/wikipedia/commons/4/47/Crevettes_sur_oignons_grill%C3%A9s.jpg",
  "pepper-soup":
    "https://upload.wikimedia.org/wikipedia/commons/e/e9/Pepper_soup_in_northern_Nigeria.jpg",
  ndjapche:
    "https://upload.wikimedia.org/wikipedia/commons/5/53/Plat_de_Njapche.jpg",
  "mpele-macabo":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Macabo_taro_pil%C3%A9_dans_une_feuille.jpg/960px-Macabo_taro_pil%C3%A9_dans_une_feuille.jpg",
  "ndomba-porc":
    "https://upload.wikimedia.org/wikipedia/commons/f/fa/NDOMBA_Light_%28Poisson_cuit_%C3%A0_l%27%C3%A9touff%C3%A9%29.gif",
  "ndomba-vipere":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Snake_soup.jpg/960px-Snake_soup.jpg",
  nsugi: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg",
  "okok-sucre":
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Ikok_mix%C3%A9_et_son_manioc_vapeur.jpg",
  "nnam-olis":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/D%C3%A9gustation_de_koki.jpg/960px-D%C3%A9gustation_de_koki.jpg",
  "nnam-wondo":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/D%C3%A9gustation_de_koki.jpg/960px-D%C3%A9gustation_de_koki.jpg",
  "porc-braise":
    "https://upload.wikimedia.org/wikipedia/commons/d/df/Smoky_grilled_pork_and_dodo.jpg",
  "poulet-braise":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Poulets_brais%C3%A9.jpg/960px-Poulets_brais%C3%A9.jpg",
  "poulet-roti":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Max%27s_Roasted_Chicken_-_Evan_Swigart.jpg/960px-Max%27s_Roasted_Chicken_-_Evan_Swigart.jpg",
  "riz-jollof":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Jollof_Rice_with_Stew.jpg/960px-Jollof_Rice_with_Stew.jpg",
  "roti-mouton":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Roast_Whole_Lamb.jpg/960px-Roast_Whole_Lamb.jpg",
  "taro-sauce-jaune":
    "https://upload.wikimedia.org/wikipedia/commons/8/82/Taro_sauce_jaune.jpg",
  "sauce-pistache":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Le_foutou_accompagn%C3%A9_de_sauce_pistache.JPG/960px-Le_foutou_accompagn%C3%A9_de_sauce_pistache.JPG",
  "sauce-tomate-champignons":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sauce_champignons.jpg/960px-Sauce_champignons.jpg",
  "sauce-oignons":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Pork_tenderloin_with_onion_sauce.jpg/960px-Pork_tenderloin_with_onion_sauce.jpg",
  "spaghettis-sardine":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Spaghetti_au_tomate_plus_la_sardine.jpg/960px-Spaghetti_au_tomate_plus_la_sardine.jpg",
  "queue-boeuf-sauce-arachides":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Slow_Cooker_Oxtail_Stew_%2843369501180%29.jpg/960px-Slow_Cooker_Oxtail_Stew_%2843369501180%29.jpg",
  "pate-arachides":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/P%C3%A2te_d%27rachide.jpg/960px-P%C3%A2te_d%27rachide.jpg",
  "pili-pili":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/African_red_devil_peppers.jpg/960px-African_red_devil_peppers.jpg",
  "pile-plantains":
    "https://upload.wikimedia.org/wikipedia/commons/1/1f/Wrapped_fufu.jpg",
  "pile-pommes-de-terre":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sous_vide_mashed_potatoes.jpg/960px-Sous_vide_mashed_potatoes.jpg",
  "pattes-boeuf-bouillon":
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Khash.jpg",
  "pattes-porc-bouillon":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/A_cold_dish_of_pig%27s_trotter.jpg/960px-A_cold_dish_of_pig%27s_trotter.jpg",
  "peau-boeuf-sauce-tomate":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Fresh_Tomato_Sauce_%28Unsplash%29.jpg/960px-Fresh_Tomato_Sauce_%28Unsplash%29.jpg",
  sanga:
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Sanga%2C_Plat_camerounais.jpg",
  "tapioca-saute":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Spicy_and_Non_Spicy_Tapioca_Chips.jpeg/960px-Spicy_and_Non_Spicy_Tapioca_Chips.jpeg",
  "muandja-moto":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Elaeis_guineensis_fruits_on_tree.jpg/960px-Elaeis_guineensis_fruits_on_tree.jpg",
  "mbongo-herisson":
    "https://upload.wikimedia.org/wikipedia/commons/5/55/Mbongo_tchobi_et_banae_plantin_malx%C3%A9.jpg",

  // =================== BATCH 3 ===================
  "tenue-militaire":
    "https://upload.wikimedia.org/wikipedia/commons/4/4c/Beignets_-_Bouillie_-_haricots.jpg",
  "porc-fume-moutarde":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Smoked_Pork_02.jpg/960px-Smoked_Pork_02.jpg",
  "beignets-koki": "https://i.ytimg.com/vi/9OTB5iXbNJw/maxresdefault.jpg",
  "beignets-mais":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Barranquilla_bu%C3%B1uelos_de_ma%C3%ADz.jpg/960px-Barranquilla_bu%C3%B1uelos_de_ma%C3%ADz.jpg",
  "bonbon-coconut":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Coconut_Candy_%2852311610055%29.jpg/960px-Coconut_Candy_%2852311610055%29.jpg",
  "caramel-arachide":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Arachides_au_caramel_de_Niamey_au_Niger.jpg/960px-Arachides_au_caramel_de_Niamey_au_Niger.jpg",
  "baton-manioc":
    "https://upload.wikimedia.org/wikipedia/commons/5/58/B%C3%A2tons_de_manioc_de_Tayap.JPG",
  "plantains-bouillis":
    "https://upload.wikimedia.org/wikipedia/commons/3/38/Boiled_plantain_with_Vegetable_soup.jpg",
  "plantains-frits-epices":
    "https://upload.wikimedia.org/wikipedia/commons/0/04/Un_plat_d%27alloco_Fried_Plantains.JPG",
  "foufou-mais":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Fufu_Balls.jpg/960px-Fufu_Balls.jpg",
  "foufou-manioc":
    "https://upload.wikimedia.org/wikipedia/commons/7/7a/Pounded_cassava.jpg",
  "tape-plantain":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Puff_Balls_also_known_Beignets.jpg/960px-Puff_Balls_also_known_Beignets.jpg",
  "boulettes-viande":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Plato_de_Alb%C3%B3ndigas.jpg/960px-Plato_de_Alb%C3%B3ndigas.jpg",
  "boulettes-poisson":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Fishball.jpg/960px-Fishball.jpg",
  "salade-fruits-exotiques":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Koh_Mak%2C_Thailand%2C_Tropical_breakfast%2C_Fruit_salad.jpg/960px-Koh_Mak%2C_Thailand%2C_Tropical_breakfast%2C_Fruit_salad.jpg",
  "banane-malaxee":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Cameroonian_Porridge_Plantain.jpg/960px-Cameroonian_Porridge_Plantain.jpg",
  kossam:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Lait_caill%C3%A9_01.jpg/960px-Lait_caill%C3%A9_01.jpg",
  "jus-ananas":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Batido_de_pi%C3%B1a.jpg/960px-Batido_de_pi%C3%B1a.jpg",

  // =================== BATCH 1 REMAINING ===================
  "salade-chou-rouge-blanc":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/2015-12-20_Spitzkohlsalat_mit_M%C3%B6hren_anagoria.JPG/960px-2015-12-20_Spitzkohlsalat_mit_M%C3%B6hren_anagoria.JPG",
  "salade-laitue":
    "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600",
  "salade-tomate":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Tomato_salad_with_onions_and_tuna.jpg/960px-Tomato_salad_with_onions_and_tuna.jpg",
  "salade-macedoine-simple":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Macedonia_salad.jpg/960px-Macedonia_salad.jpg",
  "macedoine-legumes-mayonnaise":
    "https://images.pexels.com/photos/1332275/pexels-photo-1332275.jpeg?auto=compress&cs=tinysrgb&w=600",
  "avocat-ananas-concombre-penja":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Pineapple%2C_carrots%2C_avocado_on_mixed_greens_-_Massachusetts.jpg/960px-Pineapple%2C_carrots%2C_avocado_on_mixed_greens_-_Massachusetts.jpg",
  "spaghetti-sauce-avocat":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Spaghetti_aux_avocats.jpg/960px-Spaghetti_aux_avocats.jpg",
  "assok-bitetam":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/D%C3%A9gustation_de_koki.jpg/960px-D%C3%A9gustation_de_koki.jpg",
  "choux-farcis":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/02022_Hungarian_stuffed_cabbage_rolls_in_pickled_cabbage_leaves_with_veal_and_deer_meat.jpg/960px-02022_Hungarian_stuffed_cabbage_rolls_in_pickled_cabbage_leaves_with_veal_and_deer_meat.jpg",
  "choux-sautes":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Sauteed_cabbage.jpg/960px-Sauteed_cabbage.jpg",
  "corn-tchap":
    "https://upload.wikimedia.org/wikipedia/commons/1/11/Githeri.jpg",
  disingui:
    "https://upload.wikimedia.org/wikipedia/commons/f/f6/Foufou_et_sauce_Aubergine.jpeg",
  ebandjea:
    "https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG",
  "escargots-sautes":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Escargot_brais%C3%A9_02.jpg/960px-Escargot_brais%C3%A9_02.jpg",
  "folere-en-sauce":
    "https://upload.wikimedia.org/wikipedia/commons/e/ea/Bissap_jus_00.jpg",
  "folong-saute":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Callaloo.jpg/960px-Callaloo.jpg",
  foss: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg",
  "haricots-en-sauce":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Les_haricots_cuits.jpg/960px-Les_haricots_cuits.jpg",
  "kelen-kelen":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Sukuma_wiki.jpg/960px-Sukuma_wiki.jpg",
  "kouakoukou-sauce-blanche":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Fufu_accompagn%C3%A9_d%27une_sauce_arachide_au_poulet.JPG",
  "kpem-sale":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ikok_sal%C3%A9_avec_manioc.jpg/960px-Ikok_sal%C3%A9_avec_manioc.jpg",
  "kpem-sans-sel":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Okok_and_kassava.jpg/960px-Okok_and_kassava.jpg",
  "kwa-ni-ndong":
    "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg",
  "kwaa-ndzap":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/D%C3%A9gustation_de_koki.jpg/960px-D%C3%A9gustation_de_koki.jpg",
  "kwanmkwala-esubag":
    "https://www.emaketa.com/wp-content/uploads/2025/05/hq720-4.jpg",
  mbol: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Eru_Soup.jpg",
  "met-de-pistache":
    "https://upload.wikimedia.org/wikipedia/commons/a/ad/Mets_de_pistache_pr%C3%AAt_%C3%A0_la_consommation.jpg",
  minkong:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/D%C3%A9gustation_de_koki.jpg/960px-D%C3%A9gustation_de_koki.jpg",
  missounga:
    "https://upload.wikimedia.org/wikipedia/commons/b/bc/Couscous_Senegalese_thi%C3%A8r%C3%A9_with_chicken_and_sauce.jpg",
  "nfiang-ndoo":
    "https://upload.wikimedia.org/wikipedia/commons/9/91/Ndol%C3%A8_%C3%A0_la_viande%2C_morue_et_crevettes.jpg",

  // =================== BOISSONS ===================
  "jus-de-folere":
    "https://upload.wikimedia.org/wikipedia/commons/e/ea/Bissap_jus_00.jpg",
  folere:
    "https://upload.wikimedia.org/wikipedia/commons/e/ea/Bissap_jus_00.jpg",
  "jus-folere":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Sobolo.jpg/960px-Sobolo.jpg",
  "jus-gingembre":
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Jus_de_gingembre-2025.jpg",
  "jus-de-gingembre":
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Jus_de_gingembre-2025.jpg",

  // =================== EXTRÊME-NORD ===================
  'boule-de-mil': 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Le_t%C3%B4_%C3%A0_la_sauce_d%C3%A2h.JPG',
  'sauce-folere': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Baobab_et_fol%C3%A9r%C3%A9.jpg',
  'dambou-niari': 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Couscous_de_mil_%28thi%C3%A9r%C3%A9%29.jpg',
  'tchoukou': 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Waagashi.jpg',
  'bouillie-de-mil': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Millet_porridge.png',
  'mbaibere': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Beignets_farine_et_Beignets_dougoub.jpg',
  'lwa-lwa': 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Sauce_de_gombo_avec_la_viande_et_l%27amarante_amer.jpg',
  'sauce-yakwa': 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Une_sauce_c%C3%B4p%C3%AA_en_C%C3%B4te_d%27Ivoire.jpg',
  'poisson-braise-maroua': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG',

  // =================== NORD ===================
  'massa-galettes': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/La_pr%C3%A9paration_des_galettes_%28_Massa%29.jpg',
  'sauce-feuilles-baobab': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Baobab_Leaves_%28Kukah%29.jpg',
  'bouillie-mil-lait': 'https://upload.wikimedia.org/wikipedia/commons/2/26/Bouilli_de_petit_mil_au_yaourt.jpg',

  // =================== ADAMAOUA ===================
  'dambou': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Dambou.jpg',
  'wayna': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Cooked_masa.jpg',
  'mbusiri': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Bouillie_de_petit_mil_aux_galettes_de_petit_mil_aux_arachides_sucr%C3%A9_et_sal%C3%A9.jpg',
  'naakiyaari': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Couscous_jaune_au_moringa.jpg',
  'dakkere-au-lait': 'https://upload.wikimedia.org/wikipedia/commons/0/01/Gambia_Chakery_0001.jpg',

  // =================== EST ===================
  'koko-arachides': 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Ikok_mix%C3%A9_et_son_manioc_vapeur.jpg',
  'mikom': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Edible_Caterpillar.jpg',
  'kpwem-noix-palme': 'https://upload.wikimedia.org/wikipedia/commons/d/de/Sombe_sauce_with_meat_and_ovacado_01_%28cropped%29.jpg',
  'sauce-gombo-gibier': 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Okro_soup_with_shrimps%2Cdried_fish%2Ccow_leg_and_tail_with_meat.jpg',
  'ndomba-poisson-eau-douce': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Liboke_entrouvert_03.JPG',
  'feuilles-manioc-arachides': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Sombe_sauce_served_with_kalo_and_avocado.jpg',
  'porc-epic-sauce-tomate': 'https://upload.wikimedia.org/wikipedia/commons/d/de/Cuisson_du_porc-%C3%A9pic_%28Cameroun%29.jpg',
  'sauce-arachide-poisson-fume': 'https://upload.wikimedia.org/wikipedia/commons/6/69/Sauce_d%27arachides_au_pisson_fum%C3%A9.jpg',

  // =================== SUD-OUEST ===================
  'kwacoco-bible': 'https://upload.wikimedia.org/wikipedia/commons/1/14/Kwacoco_Bible%2C_a_traditional_meal_of_the_Bakweri_people_from_the_South_West_Region_of_Cameroon.jpg',
  'mbanga-soup': 'https://upload.wikimedia.org/wikipedia/commons/8/89/Banga_Soup.jpg',
  'garri-saute-arachides': 'https://upload.wikimedia.org/wikipedia/commons/7/71/Garri_and_Groundnuts_with_honey.jpg',
  'plantain-roti-poisson': 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Port_Harcourt_Bole_and_Fish_2026.jpg',

  // =================== SUD ===================
  'nnam-ngon': 'https://upload.wikimedia.org/wikipedia/commons/6/61/Mbika_-_ground_flour_from_dried_pumpkin_seeds.jpg',
  'poisson-braise-kribi': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG',
  'crevettes-kribiennes': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Crevettes_sur_oignons_grill%C3%A9s.jpg',
  'sauce-ndoo': 'https://upload.wikimedia.org/wikipedia/commons/3/39/Ogbono_soup.jpg',
  'maban-kribi': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Smoked_fish_on_the_market.JPG',

  // =================== NORD-OUEST ===================
  'corn-chaff': 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Githeri_Meal.jpg',
  'fufu-corn': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Fufu_corn_and_khati_khati.jpg',
  'koki-corn': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Koki_Corn.jpg',
  'shaa': 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Benin_-_Tchouk_photo_9.jpg',
};

// Fallback images by category (Wikimedia when possible, Pexels otherwise)
export const categoryFallbacks: Record<Category, string> = {
  'Plat': 'https://upload.wikimedia.org/wikipedia/commons/3/30/Poulet_DG.JPG',
  'Sauce': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Mbongo_Tchobi_%28sauce_noir%29.jpg',
  'Grillade': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Poisson_brais%C3%A9_%C3%A0_la_fa%C3%A7on_du_Cameroun%2C_Kribi.JPG',
  'Entrée': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Salade_avocat_01.jpg',
  'Accompagnement': 'https://upload.wikimedia.org/wikipedia/commons/0/04/Un_plat_d%27alloco_Fried_Plantains.JPG',
  'Boisson': 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Bissap_jus_00.jpg',
  'Dessert': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Nigerian-puff-puff-recipe_cropped.jpg',
};

/**
 * Get the image URL for a recipe by its id and category.
 * Returns a specific image if available, otherwise a category fallback.
 */
export function getRecipeImage(id: string, category: Category): string {
  return recipeImages[id] ?? categoryFallbacks[category];
}
