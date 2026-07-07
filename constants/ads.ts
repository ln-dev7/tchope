// Modèle « 1 pub = N messages » (aligné sur Travora) : crédit persistant
// (utils/aiCredits.ts), la pub se re-regarde à volonté quand le solde tombe
// à 0 — pas de plafond quotidien. Tchopé Plus = jamais de pub.
// UNE SEULE constante à changer pour ajuster l'équilibre coût Claude
// (~$0.01–0.02/message) vs revenu d'une vue rewarded (~$0.002–0.01).
export const REWARDED_MESSAGES_PER_AD = 3;

// Messages TchopAI offerts UNE SEULE fois (découverte sans friction) avant la
// première pub — nouveaux comme anciens utilisateurs (voir utils/aiCredits.ts).
export const AI_WELCOME_CREDITS = 2;

// Plafond de sécurité : pubs rewarded max par jour, TOUS placements confondus
// (messages TchopAI, recherche libre, plan de repas). Invisible en usage
// normal, borne le pire cas de coût Claude par utilisateur (utils/adQuota.ts).
export const REWARDED_DAILY_LIMIT = 10;

// Fail-open du portail TchopAI : si aucune pub n'a chargé après ce délai
// (pas de remplissage, erreur AdMob…), on propose « Continuer sans pub »
// (+1 message) — l'IA ne doit jamais être bloquée par la régie.
export const REWARDED_FAILOPEN_DELAY_MS = 10_000;
