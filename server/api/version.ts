/* Version minimale de l'app (components/UpdateModal.tsx l'appelle toutes les 24 h ; la route n'existait pas sur
   Vercel avant le 17 oct. 2026). MIN_APP_VERSION (Vercel) : en dessous, l'app propose la mise à jour avec le lien de
   son store ; FORCE_UPDATE=on la rend obligatoire. Sans variable : aucune invitation. */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const min = process.env.MIN_APP_VERSION?.trim() || '0.0.0';
  res.setHeader('cache-control', 'public, max-age=300');
  res.status(200).json({
    minVersion: min,
    latestVersion: process.env.LATEST_APP_VERSION?.trim() || min,
    forceUpdate: /^(on|true|1)$/i.test(process.env.FORCE_UPDATE?.trim() ?? ''),
  });
}
