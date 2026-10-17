import type { VercelRequest, VercelResponse } from '@vercel/node';

/** En-têtes d'une requête Vercel lus comme un objet Headers (get insensible à la casse). */
export function headersOf(req: VercelRequest): { get(name: string): string | null } {
  return {
    get(name: string) {
      const v = req.headers[name.toLowerCase()];
      return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    },
  };
}

export function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tchope-user, x-tchope-pro');
}

const APP_STORE = 'https://apps.apple.com/app/tchope/id6791111069';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.lndev.tchope';

/** « Mettez Tchopé à jour » avec le lien du store du téléphone (User-Agent du fetch natif : CFNetwork/Darwin sur
 *  iPhone, okhttp sur Android ; les deux liens sinon). Bilingue : la requête d'une ancienne app ne dit pas sa langue. */
export function updateAppText(ua: string | null): string {
  const ios = !!ua && /CFNetwork|Darwin|iPhone|iPad|iOS/i.test(ua);
  const android = !!ua && /okhttp|Android|Dalvik/i.test(ua);
  const link = ios ? APP_STORE : android ? PLAY_STORE : `iPhone : ${APP_STORE}\nAndroid : ${PLAY_STORE}`;
  return `Cette version de Tchopé n'est plus compatible avec TchopAI. Mettez l'application à jour pour continuer :\n${link}\n\nThis version of Tchopé no longer works with TchopAI. Please update the app to continue.`;
}
