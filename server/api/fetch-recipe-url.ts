/* Ancienne adresse (versions ≤ 1.10) : la lecture d'un lien de recette est servie par tchope-web depuis le 18 oct. 2026.
   L'ancienne app traite tout refus comme « lien illisible » et envoie quand même le message au chat, qui répond
   « mettez à jour » (api/claude.ts). */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../lib/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(403).json({ error: 'update-app' });
}
