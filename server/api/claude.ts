/* Relais Claude de l'app Tchopé, verrouillé (17 oct. 2026) :
   - lib/claude-policy.ts : modèles autorisés, max_tokens plafonné, taille bornée (avant : relais ouvert à tout) ;
   - lib/pro-check.ts : Tchopé Pro vérifié auprès de RevenueCat ; seul le chat texte a un avant-goût gratuit, toutes
     les autres fonctions IA (photo, recherche par ingrédients, recherche libre, planning, guidage vocal) sont Pro ;
   - limites par appareil (abonné) ou par IP (anciennes apps).
   Le corps porte `feature` (app ≥ 2.0.0). Une image dans les messages = fonction photo, donc Pro. */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ANTHROPIC_URL } from '../config';
import { cleanClaudeRequest } from '../lib/claude-policy';
import { FEATURES, accessRefusal, checkLimits, needsPro, resolveAccess, type Feature } from '../lib/pro-check';
import { cors, headersOf, updateAppText } from '../lib/http';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const headers = headersOf(req);
  const access = await resolveAccess(headers);
  const refusal = accessRefusal(access);
  if (refusal?.error === 'update-app') {
    // Une ancienne app affiche le texte d'une réponse réussie (chat) ; elle ignore le corps d'une erreur.
    return res.status(200).json({ content: [{ type: 'text', text: updateAppText(headers.get('user-agent')) }], stop_reason: 'end_turn' });
  }
  if (refusal) return res.status(refusal.status).json({ error: refusal.error });

  const clean = cleanClaudeRequest(req.body);
  if ('error' in clean) return res.status(clean.error === 'too-large' ? 413 : 400).json({ error: clean.error });

  const declared = typeof req.body?.feature === 'string' && (FEATURES as string[]).includes(req.body.feature) ? (req.body.feature as Feature) : 'chat';
  const feature: Feature = clean.images > 0 && declared === 'chat' ? 'chat-photo' : declared;
  if (needsPro(access, feature)) return res.status(402).json({ error: 'pro-required' });

  const rl = checkLimits(access, feature);
  if (!rl.ok) {
    if (access.mode === 'verified' && !access.pro && rl.reason === 'day') return res.status(402).json({ error: 'pro-required' });
    return res.status(429).json({ error: rl.reason === 'day' ? 'daily-limit' : 'slow-down' });
  }

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({ model: clean.model, max_tokens: clean.max_tokens, system: clean.system, messages: clean.messages }),
    });
    if (!response.ok) {
      console.error(`[claude] Anthropic HTTP ${response.status} : ${(await response.text()).slice(0, 300)}`);
      return res.status(502).json({ error: 'ai-failed' });
    }
    return res.status(200).json(await response.json());
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
