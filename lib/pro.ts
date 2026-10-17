// Tchopé Pro : abonnement mensuel (2,99 $ / mois) qui débloque TOUTES les fonctions IA de Tchopé (décision de LN,
// 17 oct. 2026) : TchopAI (au-delà de 3 messages gratuits au total), photo dans le chat, recherche par ingrédients,
// recherche libre, planning de la semaine et guidage vocal. Même conception que Travora Pro (travora-app/lib/pro.ts) :
// RevenueCat (projet « LN Dev », entitlement `pro`, offre `tchope`, paquet « Monthly »), pas de compte utilisateur,
// identité anonyme ; « Restaurer mes achats » retrouve l'abonnement via le compte Apple / Google.
//
// SDK chargé à l'usage (une coque native sans le module démarre quand même). Clés publiques dans
// `constants/revenuecat.ts` (ou `EXPO_PUBLIC_REVENUECAT_*_KEY`) ; sans clé : achat « indisponible », avant-goût seul.
import { Platform } from "react-native";
import { REVENUECAT_KEYS } from "@/constants/revenuecat";

export const ENTITLEMENT = "pro";
export const OFFERING = "tchope";
/** Avant-goût gratuit : 3 messages TchopAI au total (texte seulement) ; tout le reste de l'IA est réservé aux abonnés. */
export const FREE_CHAT_MESSAGES = 3;
/** Gérer / résilier l'abonnement : réglages du store. */
export const MANAGE_URL = Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";

export const purchasesAvailable = Platform.OS !== "web";

export function apiKey(): string | null {
  const env = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === "android" ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : null;
  const builtIn = Platform.OS === "ios" ? REVENUECAT_KEYS.ios : Platform.OS === "android" ? REVENUECAT_KEYS.android : "";
  return env?.trim() || builtIn.trim() || null;
}

export interface ProOffer {
  /** Prix localisé du store (« 2,99 $US », « 2,99 € »…) : le SEUL prix jamais affiché (règle App Store 3.1.2). */
  price: string;
  /** Paquet RevenueCat à acheter (opaque pour le reste de l'app). */
  pkg: unknown;
}

export interface ProState {
  pro: boolean;
  /** Lien de gestion de l'abonnement fourni par le store (bon compte, bon store), sinon null. */
  managementURL: string | null;
}

type Sdk = typeof import("react-native-purchases");

let sdk: Sdk | null = null;
async function load(): Promise<Sdk | null> {
  if (!purchasesAvailable) return null;
  if (!sdk) {
    try {
      sdk = await import("react-native-purchases");
    } catch {
      return null; // coque native sans le module
    }
  }
  return sdk;
}

let configured = false;
// Pour le contrôle de l'abonnement côté serveur (server/lib/pro-check.ts) : identifiant ANONYME RevenueCat de
// l'appareil et dernier état Pro connu (simple indice : le serveur revérifie toujours auprès de RevenueCat).
let appUserId: string | null = null;
let lastPro = false;

async function refreshAppUserId(m: Sdk) {
  try {
    appUserId = await m.default.getAppUserID();
  } catch {
    /* sans identifiant, le serveur applique ses limites d'avant */
  }
}

/**
 * Appel à l'API avec réessai unique quand elle répond 403 `unknown-device` : le serveur (API v2 de RevenueCat) ne connaît
 * pas encore cet appareil, cas d'un tout premier appel avant que le SDK ait créé son client chez RevenueCat. On
 * redemande l'état au SDK (ce qui le synchronise), on attend 2 s, puis on rappelle une fois avec les en-têtes à jour.
 * Un autre 403 est rendu tel quel (le corps est lu : les appelants ne lisent pas le corps d'un 403).
 */
export async function fetchWithDeviceRetry(doFetch: () => Promise<Response>): Promise<Response> {
  const res = await doFetch();
  if (res.status !== 403) return res;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error !== "unknown-device") return res;
  await fetchPro();
  const m = await load();
  if (m && configured) await refreshAppUserId(m);
  await new Promise((r) => setTimeout(r, 2000));
  return doFetch();
}

/** En-têtes ajoutés aux appels de l'API Tchopé (IA, lecture de lien). */
export function proHeaders(): Record<string, string> {
  return appUserId ? { "x-tchope-user": appUserId, "x-tchope-pro": lastPro ? "1" : "0" } : {};
}
// Délégué au niveau module : le SDK n'enregistre son écouteur qu'une fois, mais le provider peut être remonté
// (Fast Refresh) ; le dernier `configurePurchases` reçoit les mises à jour.
let listener: ((s: ProState) => void) | null = null;

/** À appeler une fois au démarrage. Renvoie false si non configuré (pas de clé, pas de module natif, clé refusée). */
export async function configurePurchases(onChange: (s: ProState) => void): Promise<boolean> {
  const key = apiKey();
  if (!key) return false;
  const m = await load();
  if (!m) return false;
  listener = onChange;
  if (!configured) {
    try {
      // Lève si le module natif manque (coque sans rebuild) ou si la clé n'est pas acceptée (Expo Go).
      m.default.configure({ apiKey: key });
      m.default.addCustomerInfoUpdateListener((info) => listener?.(stateOf(info)));
      if (__DEV__) {
        // Le SDK journalise « Purchase was cancelled » en erreur : en développement, LogBox l'affiche en rouge plein
        // écran alors qu'un achat annulé est un cas normal (géré par PurchaseResult). On garde le journal, en bas niveau.
        m.default.setLogHandler((level, message) => {
          const line = `[RevenueCat] ${message}`;
          if (level === m.LOG_LEVEL.ERROR && !/cancel/i.test(message)) console.warn(line);
          else if (level !== m.LOG_LEVEL.VERBOSE && level !== m.LOG_LEVEL.DEBUG) console.log(line);
        });
      } else {
        m.default.setLogLevel(m.LOG_LEVEL.ERROR).catch(() => {});
      }
      configured = true;
    } catch {
      return false;
    }
  }
  void refreshAppUserId(m);
  return true;
}

type Info = { entitlements: { active: Record<string, unknown> }; managementURL?: string | null };

function isPro(info: Info): boolean {
  return Boolean(info.entitlements.active[ENTITLEMENT]);
}

function stateOf(info: Info): ProState {
  lastPro = isPro(info);
  return { pro: lastPro, managementURL: info.managementURL ?? null };
}

export async function fetchPro(): Promise<ProState | null> {
  const m = await load();
  if (!m || !configured) return null;
  try {
    return stateOf(await m.default.getCustomerInfo());
  } catch {
    return null;
  }
}

export async function fetchOffer(): Promise<ProOffer | null> {
  const m = await load();
  if (!m || !configured) return null;
  try {
    const offerings = await m.default.getOfferings();
    const offering = offerings.all[OFFERING] ?? offerings.current;
    // Seulement le paquet mensuel : l'écran dit « / mois », on ne vend jamais autre chose sous ce libellé.
    const pkg = offering?.monthly ?? null;
    if (!pkg) return null;
    return { price: pkg.product.priceString, pkg };
  } catch {
    return null;
  }
}

/**
 * purchased : payé et entitlement actif. pending : payé (ou paiement en attente côté store) mais entitlement pas
 * encore actif — ne JAMAIS dire « tu n'as pas été débité ». already : le store dit que l'abonnement existe déjà →
 * proposer « Restaurer ». cancelled : l'utilisateur a fermé la feuille du store. failed : erreur réelle.
 */
export type PurchaseResult = "purchased" | "pending" | "already" | "cancelled" | "failed";

export async function purchase(offer: ProOffer): Promise<PurchaseResult> {
  const m = await load();
  if (!m || !configured) return "failed";
  try {
    const { customerInfo } = await m.default.purchasePackage(offer.pkg as Parameters<typeof m.default.purchasePackage>[0]);
    const s = stateOf(customerInfo);
    listener?.(s);
    return s.pro ? "purchased" : "pending";
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    const C = m.PURCHASES_ERROR_CODE;
    if (err?.userCancelled || err?.code === C.PURCHASE_CANCELLED_ERROR) return "cancelled";
    if (err?.code === C.PAYMENT_PENDING_ERROR) return "pending";
    if (err?.code === C.PRODUCT_ALREADY_PURCHASED_ERROR) return "already";
    return "failed";
  }
}

/** Renvoie l'état Pro après restauration, null si impossible. */
export async function restore(): Promise<ProState | null> {
  const m = await load();
  if (!m || !configured) return null;
  try {
    const s = stateOf(await m.default.restorePurchases());
    void refreshAppUserId(m); // une restauration peut rattacher l'appareil à l'acheteur d'origine
    listener?.(s);
    return s;
  } catch {
    return null;
  }
}

/** iOS : feuille native de gestion de l'abonnement ; ailleurs null (ouvrir `managementURL` ou MANAGE_URL). */
export async function showManageSubscriptions(): Promise<boolean> {
  const m = await load();
  if (!m || !configured || Platform.OS !== "ios") return false;
  try {
    await m.default.showManageSubscriptions();
    return true;
  } catch {
    return false;
  }
}
