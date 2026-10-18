/* Ancienne adresse de l'IA (tchope-api.vercel.app), appelée seulement par les versions ≤ 1.10 de l'app.
   Depuis le 18 oct. 2026, l'IA de l'app (≥ 2.0.0, Tchopé Pro) est servie par le site tchope-web (`/api/claude`) ; ici on
   ne relaie plus rien vers Anthropic : chaque demande reçoit le message « Mettez l'application à jour » avec le lien du
   store du téléphone. Réponse 200 au format d'Anthropic, car l'ancienne app n'affiche que le texte d'une réponse réussie
   (le chat le montre ; les autres écrans affichent leur message d'erreur habituel). */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, headersOf, updateAppText } from '../lib/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({
    content: [{ type: 'text', text: updateAppText(headersOf(req).get('user-agent')) }],
    stop_reason: 'end_turn',
  });
}
