/**
 * Pont entre utils/api.ts (hors React) et context/ProContext.tsx, comme utils/aiConsentBridge.ts pour le consentement.
 * Toutes les fonctions IA passent par callClaude / callClaudeLive : la règle Tchopé Pro y est appliquée une seule fois
 * (décision de LN, 17 oct. 2026 : tout est Pro, sauf 3 messages TchopAI texte gratuits au total).
 */
export type PaywallReason = 'chat' | 'feature' | 'settings';

/** Fonctions IA (même liste que server/lib/pro-check.ts). */
export type AiFeature = 'chat' | 'chat-photo' | 'ingredients' | 'search' | 'plan' | 'plan-adjust' | 'live-cooking';

interface Bridge {
  isPro: () => boolean;
  freeChatLeft: () => number;
  consumeChat: () => void;
  openPaywall: (reason: PaywallReason) => void;
}

let bridge: Bridge | null = null;

export function registerProBridge(b: Bridge) {
  bridge = b;
  return () => {
    if (bridge === b) bridge = null;
  };
}

/** Levée quand une fonction IA est demandée sans abonnement : l'écran Tchopé Pro est déjà ouvert, l'appelant se tait. */
export class ProRequiredError extends Error {
  constructor() {
    super('pro-required');
    this.name = 'ProRequiredError';
  }
}

export const isProRequired = (e: unknown): boolean => e instanceof ProRequiredError || (e instanceof Error && e.name === 'ProRequiredError');

/** Vérifie avant l'appel : Pro, ou message de chat gratuit restant. Ouvre l'écran Pro sinon. */
export function assertAiAllowed(feature: AiFeature) {
  if (!bridge) return; // provider pas encore monté : le serveur tranche
  if (bridge.isPro()) return;
  if (feature === 'chat' && bridge.freeChatLeft() > 0) return;
  bridge.openPaywall(feature === 'chat' ? 'chat' : 'feature');
  throw new ProRequiredError();
}

/** Même règle, sans exception : à appeler au début d'une action (avant d'afficher quoi que ce soit). false = l'écran
 *  Tchopé Pro vient de s'ouvrir, l'action s'arrête. */
export function requireAi(feature: AiFeature): boolean {
  try {
    assertAiAllowed(feature);
    return true;
  } catch {
    return false;
  }
}

/** Un message gratuit consommé (seulement après une réponse réussie du serveur). */
export function consumeFreeChat(feature: AiFeature) {
  if (feature === 'chat') bridge?.consumeChat();
}

/** Le serveur a refusé (402) : écran Pro. */
export function openPaywallFromServer(feature: AiFeature) {
  bridge?.openPaywall(feature === 'chat' ? 'chat' : 'feature');
}
