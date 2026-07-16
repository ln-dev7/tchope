import { Platform } from 'react-native';

// Blocs AdMob de production, par placement. En __DEV__, useRewardedAd et
// AdBanner substituent les TestIds — ne jamais consommer ces IDs en dev.
export const AD_UNITS = {
  // "Tchope Banner Ad" — bannière de l'accueil
  bannerHome: Platform.select({
    android: 'ca-app-pub-2222017759396595/2143678108',
    ios: 'ca-app-pub-2222017759396595/8194150944',
  }),
  // "Tchope Recipe Detail Banner" — bannière du détail de recette
  bannerRecipe: Platform.select({
    android: 'ca-app-pub-2222017759396595/2805909114',
    ios: 'ca-app-pub-2222017759396595/1815306785',
  }),
  // "TchopAI Rewarded Message" — 1 pub = REWARDED_MESSAGES_PER_AD messages
  rewardedMessages: Platform.select({
    android: 'ca-app-pub-2222017759396595/3107451588',
    ios: 'ca-app-pub-2222017759396595/8002579254',
  }),
  // "Tchope AI Search Rewarded" — 1 pub = 1 recherche IA
  rewardedSearch: Platform.select({
    android: 'ca-app-pub-2222017759396595/1424424545',
    ios: 'ca-app-pub-2222017759396595/5172097865',
  }),
  // "Tchope Meal Plan Rewarded" — 1 pub = 1 génération OU 1 ajustement de plan
  rewardedPlan: Platform.select({
    android: 'ca-app-pub-2222017759396595/5746812936',
    ios: 'ca-app-pub-2222017759396595/6408589692',
  }),
  // "Tchope Live Rewarded" — 1 pub = 1 session TchopAI Live (le placement le
  // plus cher en API : ne jamais assouplir sans revoir REWARDED_DAILY_LIMIT)
  rewardedLive: Platform.select({
    android: 'ca-app-pub-2222017759396595/4768773187',
    ios: 'ca-app-pub-2222017759396595/5898976315',
  }),
} as const;

// Modèle « 1 pub = N messages » (aligné sur Travora) : crédit persistant
// (utils/aiCredits.ts), la pub se re-regarde à volonté quand le solde tombe
// à 0. UNE SEULE constante à changer pour ajuster l'équilibre coût Claude
// (~$0.01–0.02/message) vs revenu d'une vue rewarded (~$0.002–0.01).
// L'envoi de photo consomme aussi 1 crédit (borné par useImageQuota).
export const REWARDED_MESSAGES_PER_AD = 3;

// Messages TchopAI offerts UNE SEULE fois (découverte sans friction) avant la
// première pub — nouveaux comme anciens utilisateurs (voir utils/aiCredits.ts).
export const AI_WELCOME_CREDITS = 2;

// Plafond de sécurité : pubs rewarded max par jour, TOUS placements confondus
// (messages TchopAI, recherche libre, plan de repas, sessions Live). Invisible
// en usage normal, borne le pire cas de coût Claude par utilisateur
// (utils/adQuota.ts).
export const REWARDED_DAILY_LIMIT = 10;

// Fail-open des portails rewarded : si aucune pub n'a chargé après ce délai
// (pas de remplissage, erreur AdMob…), on propose « Continuer sans pub »
// — l'IA ne doit jamais être bloquée par la régie.
export const REWARDED_FAILOPEN_DELAY_MS = 10_000;
