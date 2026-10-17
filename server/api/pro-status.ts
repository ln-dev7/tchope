/* Diagnostic du contrôle Tchopé Pro (lib/pro-check.ts), sans secret : `active: true` seulement si la clé v2 est
   acceptée, les droits sont bons et l'entitlement `pro` existe dans ce projet RevenueCat. */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proCheckStatus } from '../lib/pro-check';
import { checkRateLimit, clientKeyFromHeaders } from '../lib/rate-limit';
import { headersOf } from '../lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rl = checkRateLimit(`pro-status:${clientKeyFromHeaders(headersOf(req) as Headers)}`, { perMinute: 5, perDay: 100 });
  if (!rl.ok) return res.status(429).json({ error: 'slow-down' });
  res.setHeader('cache-control', 'no-store');
  return res.status(200).json(await proCheckStatus());
}
