/* Import d'une recette depuis un lien collé dans le chat TchopAI : le serveur lit la page et en renvoie le texte.
   17 oct. 2026 : même contrôle d'accès que /api/claude (lib/pro-check.ts, fonction `recipe-url`, qui fait partie du
   chat), limites, et refus des adresses internes (localhost, réseaux privés) pour ne pas servir de relais. */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { accessRefusal, checkLimits, resolveAccess } from '../lib/pro-check';
import { cors, headersOf } from '../lib/http';

/** Hôte interne ou réservé (adresse IP littérale ou nom local) : jamais lu par le serveur. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.') && !h.includes(':')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h)) return true;
  if (h.includes(':') && (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h.startsWith('::ffff:'))) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await resolveAccess(headersOf(req));
  const refusal = accessRefusal(access);
  if (refusal) return res.status(refusal.status).json({ error: refusal.error });
  const rl = checkLimits(access, 'recipe-url');
  if (!rl.ok) return res.status(429).json({ error: rl.reason === 'day' ? 'daily-limit' : 'slow-down' });

  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' });
  }

  // Validate URL format
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Invalid protocol' });
  }
  if (isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Invalid host' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Redirections suivies à la main (3 au plus) pour revérifier l'hôte à chaque saut.
    let target = parsed;
    let response: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(target.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Tchope/1.0)',
          'Accept': 'text/html',
        },
        signal: controller.signal,
        redirect: 'manual',
      });
      const loc = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
      if (!loc) break;
      target = new URL(loc, target);
      if (!['http:', 'https:'].includes(target.protocol) || isPrivateHost(target.hostname)) {
        clearTimeout(timeout);
        return res.status(400).json({ error: 'Invalid redirect' });
      }
      response = null;
    }
    clearTimeout(timeout);
    if (!response) return res.status(400).json({ error: 'Too many redirects' });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return res.status(400).json({ error: 'URL does not point to an HTML page' });
    }

    const html = await response.text();

    // Extract text content — strip tags, scripts, styles
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to ~4000 chars to avoid oversized prompts
    const truncated = text.length > 4000 ? text.slice(0, 4000) + '...' : text;

    return res.status(200).json({ content: truncated });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    return res.status(500).json({ error: 'Failed to fetch URL' });
  }
}
