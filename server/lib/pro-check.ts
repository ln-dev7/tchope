/* Tchopé Pro vérifié CÔTÉ SERVEUR (17 oct. 2026, même conception que Travora : travora/lib/pro-check.ts).

   L'app (≥ 1.11.0) envoie :
   - `x-tchope-user` : son identifiant ANONYME RevenueCat (`$RCAnonymousID:<32 hex>`), aucun nom ni e-mail ;
   - `x-tchope-pro` : `1` si l'app se croit abonnée (simple indice : déclenche une revérification après un achat).
   Le serveur interroge l'API v2 de RevenueCat (`GET /v2/projects/{REVENUECAT_PROJECT_ID}/customers/{id}`, clé secrète v2
   `REVENUECAT_SECRET_KEY`, droits en lecture « Customer information » et « Project configuration ») : l'entitlement
   `pro` est-il actif ? La v2 répond 404 pour un identifiant inconnu (inventé par un script) → 403 `unknown-device`
   (l'app réessaie une fois après 2 s, cas d'un tout premier appel avant que le SDK ait créé son client).

   Modes :
   - `off` : clé ou projet absents → aucun contrôle d'abonnement (limites par IP seulement) ;
   - `legacy` : configuré, mais app sans identifiant (≤ 1.10.x) → limites par IP ; `PRO_REQUIRE_DEVICE=on` les refuse
     (403 `update-app`) une fois la nouvelle version en ligne sur les deux stores ;
   - `verified` : abonnement réel vérifié, limites par appareil.
   RevenueCat injoignable ou clé refusée : on suit l'indice de l'app (journalisé). Diagnostic : /api/pro-status. */
import { checkRateLimit, clientKeyFromHeaders, type RateLimitResult } from './rate-limit';

type HeaderGetter = { get(name: string): string | null };

const API = 'https://api.revenuecat.com/v2/projects/';
const ENTITLEMENT_KEY = 'pro';
const DEVICE_ID = /^\$RCAnonymousID:[0-9a-f]{32}$/;
const PRO_TTL_MS = 10 * 60_000;
const FREE_TTL_MS = 60_000;
const HINT_RECHECK_MS = 15_000;
const TIMEOUT_MS = 4_000;
const MAX_CACHE = 5_000;
const LOOKUPS_PER_IP = { perMinute: 120, perDay: 5_000 };

export type AccessMode = 'off' | 'legacy' | 'verified';
export type DeviceStatus = 'pro' | 'free' | 'unknown';
export interface Access {
  mode: AccessMode;
  pro: boolean;
  known: boolean;
  device: string | null;
  ip: string;
}

interface Cached {
  status: 'pro' | 'free';
  at: number;
}
const cache = new Map<string, Cached>();

interface Config {
  key: string;
  project: string;
}
let warned = false;
function config(): Config | null {
  const key = process.env.REVENUECAT_SECRET_KEY?.trim();
  const project = process.env.REVENUECAT_PROJECT_ID?.trim();
  if (!key) return null;
  if (!project) {
    if (!warned) console.error('[pro-check] REVENUECAT_SECRET_KEY sans REVENUECAT_PROJECT_ID : contrôle désactivé.');
    warned = true;
    return null;
  }
  return { key, project };
}

export function requireDevice(): boolean {
  return /^(on|true|1)$/i.test(process.env.PRO_REQUIRE_DEVICE?.trim() ?? '');
}

export function deviceFromHeaders(headers: HeaderGetter): string | null {
  const id = headers.get('x-tchope-user')?.trim() ?? '';
  return DEVICE_ID.test(id) ? id : null;
}

async function get(cfg: Config, path: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(API + encodeURIComponent(cfg.project) + path, {
      headers: { authorization: `Bearer ${cfg.key}`, accept: 'application/json' },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function listEntitlementId(cfg: Config): Promise<string> {
  const res = await get(cfg, '/entitlements?limit=100');
  if (!res.ok) throw new Error(`entitlements HTTP ${res.status}`);
  const data = (await res.json()) as { items?: { id?: string; lookup_key?: string }[] };
  const id = data.items?.find((e) => e.lookup_key === ENTITLEMENT_KEY)?.id;
  if (!id) throw new Error(`entitlement « ${ENTITLEMENT_KEY} » introuvable`);
  return id;
}

let entitlementId: Promise<string> | null = null;
function proEntitlementId(cfg: Config): Promise<string> {
  const fromEnv = process.env.REVENUECAT_ENTITLEMENT_ID?.trim();
  if (fromEnv) return Promise.resolve(fromEnv);
  if (!entitlementId) {
    entitlementId = listEntitlementId(cfg).catch((e) => {
      entitlementId = null;
      throw e;
    });
  }
  return entitlementId;
}

type ActiveEntitlement = { entitlement_id?: string; expires_at?: number | string | null };

export function activeEntitlement(items: ActiveEntitlement[] | undefined, id: string, now = Date.now()): boolean {
  return (items ?? []).some((e) => {
    if (e.entitlement_id !== id) return false;
    if (e.expires_at == null) return true;
    const end = typeof e.expires_at === 'number' ? e.expires_at : Date.parse(e.expires_at);
    return Number.isFinite(end) && end > now;
  });
}

async function askRevenueCat(device: string, cfg: Config): Promise<DeviceStatus> {
  const [res, id] = await Promise.all([get(cfg, `/customers/${encodeURIComponent(device)}`), proEntitlementId(cfg)]);
  if (res.status === 404) return 'unknown';
  if (!res.ok) throw new Error(`customer HTTP ${res.status}`);
  const data = (await res.json()) as { active_entitlements?: { items?: ActiveEntitlement[] } };
  return activeEntitlement(data.active_entitlements?.items, id) ? 'pro' : 'free';
}

export async function deviceStatus(device: string, hintPro: boolean, cfg: Config, ip = 'test', now = Date.now()): Promise<DeviceStatus> {
  const c = cache.get(device);
  if (c) {
    const age = now - c.at;
    if (c.status === 'pro' && age < PRO_TTL_MS) return 'pro';
    if (c.status === 'free' && age < FREE_TTL_MS && !(hintPro && age >= HINT_RECHECK_MS)) return 'free';
  }
  if (!c && !checkRateLimit(`rc-lookup:${ip}`, LOOKUPS_PER_IP).ok) return 'unknown';
  try {
    const status = await askRevenueCat(device, cfg);
    if (status !== 'unknown') {
      if (cache.size >= MAX_CACHE) {
        for (const [k, v] of cache) if (now - v.at > PRO_TTL_MS) cache.delete(k);
        if (cache.size >= MAX_CACHE) cache.clear();
      }
      cache.set(device, { status, at: now });
    }
    return status;
  } catch (e) {
    console.error(`[pro-check] RevenueCat injoignable : ${e instanceof Error ? e.message : e}`);
    return hintPro ? 'pro' : 'free';
  }
}

export async function resolveAccess(headers: HeaderGetter): Promise<Access> {
  const ip = clientKeyFromHeaders(headers as Headers);
  const cfg = config();
  if (!cfg) return { mode: 'off', pro: false, known: true, device: null, ip };
  const device = deviceFromHeaders(headers);
  if (!device) return { mode: 'legacy', pro: false, known: true, device: null, ip };
  const status = await deviceStatus(device, headers.get('x-tchope-pro') === '1', cfg, ip);
  return { mode: 'verified', pro: status === 'pro', known: status !== 'unknown', device, ip };
}

/** Refus avant tout travail : 403 `update-app` (PRO_REQUIRE_DEVICE=on, app sans identifiant) ou `unknown-device`. */
export function accessRefusal(a: Access): { status: 403; error: 'update-app' | 'unknown-device' } | null {
  if (a.mode === 'legacy' && requireDevice()) return { status: 403, error: 'update-app' };
  if (a.mode === 'verified' && !a.known) return { status: 403, error: 'unknown-device' };
  return null;
}

/** Fonctions IA de Tchopé. Seul le chat texte a un avant-goût gratuit (3 messages dans l'app). */
export type Feature = 'chat' | 'chat-photo' | 'ingredients' | 'search' | 'plan' | 'plan-adjust' | 'live-cooking' | 'recipe-url';
export const FEATURES: Feature[] = ['chat', 'chat-photo', 'ingredients', 'search', 'plan', 'plan-adjust', 'live-cooking', 'recipe-url'];
const FREE_FEATURES = new Set<Feature>(['chat', 'recipe-url']);

export function needsPro(a: Access, feature: Feature): boolean {
  return a.mode === 'verified' && !a.pro && !FREE_FEATURES.has(feature);
}

/** Avant-goût côté serveur : l'app offre 3 messages au total ; le serveur tolère 5 par appareil et par jour (marge pour
 *  un message coupé en route) et 300 par IP et par jour. */
export const FREE_CHAT_PER_DAY = 5;
export const FREE_IP = { perMinute: 30, perDay: 300 };

/** Avant (app sans identifiant) : par IP, larges car les IP des opérateurs camerounais sont partagées. */
const LEGACY = {
  claude: { perMinute: 60, perDay: 1_500 },
  url: { perMinute: 20, perDay: 300 },
};
/** Abonné vérifié : par appareil (le guidage vocal fait beaucoup d'appels) + garde-fou par IP. */
const PRO_DEVICE = { perMinute: 30, perDay: 400 };
const PRO_IP = { perMinute: 600, perDay: 20_000 };

export function checkLimits(a: Access, feature: Feature): RateLimitResult {
  const url = feature === 'recipe-url';
  if (a.mode !== 'verified' || !a.device) return checkRateLimit(`${url ? 'url' : 'claude'}:${a.ip}`, url ? LEGACY.url : LEGACY.claude);
  const checks: RateLimitResult[] = [];
  if (a.pro) {
    checks.push(checkRateLimit(`pro:dev:${a.device}`, PRO_DEVICE));
    checks.push(checkRateLimit(`pro:ip:${a.ip}`, PRO_IP));
  } else if (url) {
    checks.push(checkRateLimit(`free-url:dev:${a.device}`, { perMinute: 4, perDay: FREE_CHAT_PER_DAY }));
  } else {
    checks.push(checkRateLimit(`free-chat:dev:${a.device}`, { perMinute: 4, perDay: FREE_CHAT_PER_DAY }));
    checks.push(checkRateLimit(`free-chat:ip:${a.ip}`, FREE_IP));
  }
  return checks.find((c) => !c.ok) ?? { ok: true };
}

export interface ProCheckStatus {
  active: boolean;
  key: boolean;
  project: boolean;
  entitlement: 'ok' | 'missing' | 'error' | 'skipped';
  customers: 'ok' | 'error' | 'skipped';
  requireDevice: boolean;
  errors: string[];
}

/** Diagnostic sans secret (route /api/pro-status) : une clé refusée ou un projet absent ne bloquent personne, donc
 *  « l'app répond » ne prouve pas que le contrôle marche. */
export async function proCheckStatus(): Promise<ProCheckStatus> {
  const key = !!process.env.REVENUECAT_SECRET_KEY?.trim();
  const project = !!process.env.REVENUECAT_PROJECT_ID?.trim();
  const out: ProCheckStatus = { active: false, key, project, entitlement: 'skipped', customers: 'skipped', requireDevice: requireDevice(), errors: [] };
  const cfg = config();
  if (!cfg) {
    out.errors.push(!key ? 'REVENUECAT_SECRET_KEY absente : contrôle éteint.' : 'REVENUECAT_PROJECT_ID absente : contrôle éteint.');
    return out;
  }
  try {
    const found = await listEntitlementId(cfg);
    const fromEnv = process.env.REVENUECAT_ENTITLEMENT_ID?.trim();
    if (fromEnv && fromEnv !== found) throw new Error(`REVENUECAT_ENTITLEMENT_ID (${fromEnv}) ≠ id de « ${ENTITLEMENT_KEY} » (${found})`);
    out.entitlement = 'ok';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    out.entitlement = /introuvable/.test(msg) ? 'missing' : 'error';
    out.errors.push(`Entitlements : ${msg} (droit « Project configuration » en lecture, ID du projet ?)`);
  }
  try {
    const res = await get(cfg, `/customers/${encodeURIComponent('$RCAnonymousID:' + '0'.repeat(32))}`);
    if (res.status === 404 || res.ok) out.customers = 'ok';
    else {
      out.customers = 'error';
      out.errors.push(`Clients : HTTP ${res.status} (clé v2, droit « Customer information » en lecture ?)`);
    }
  } catch (e) {
    out.customers = 'error';
    out.errors.push(`Clients : ${e instanceof Error ? e.message : e}`);
  }
  out.active = out.entitlement === 'ok' && out.customers === 'ok';
  return out;
}

export function _resetProCache() {
  cache.clear();
  entitlementId = null;
}
