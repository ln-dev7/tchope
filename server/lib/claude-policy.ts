/* Ce que /api/claude accepte (17 oct. 2026). Avant, le serveur relayait TEL QUEL n'importe quel modèle, n'importe quel
   max_tokens et n'importe quel prompt : n'importe qui pouvait utiliser la clé Anthropic de Tchopé comme un Claude
   gratuit. Maintenant : modèles autorisés seulement, max_tokens plafonné, taille et nombre de messages bornés, images
   comptées (elles sont réservées à Tchopé Pro). */

export const DEFAULT_MODELS = ['claude-haiku-4-5-20251001', 'claude-haiku-4-5'];
export const MAX_TOKENS_CAP = 2048;
const MAX_MESSAGES = 60;
const MAX_TEXT_CHARS = 120_000;
const MAX_IMAGES = 2;
const MAX_IMAGE_B64 = 3_000_000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function allowedModels(): string[] {
  const env = process.env.ALLOWED_MODELS?.split(',').map((s: string) => s.trim()).filter(Boolean);
  return env?.length ? env : DEFAULT_MODELS;
}

type TextBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };
type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
type Content = string | (TextBlock | ImageBlock)[];

export interface CleanRequest {
  model: string;
  max_tokens: number;
  system: string | TextBlock[];
  messages: { role: 'user' | 'assistant'; content: Content }[];
  images: number;
}

export type PolicyError = 'bad-request' | 'model-not-allowed' | 'too-large';

export function cleanClaudeRequest(body: unknown): CleanRequest | { error: PolicyError } {
  if (!body || typeof body !== 'object') return { error: 'bad-request' };
  const b = body as Record<string, unknown>;
  if (typeof b.model !== 'string' || !allowedModels().includes(b.model)) return { error: 'model-not-allowed' };
  if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > MAX_MESSAGES) return { error: 'bad-request' };
  let chars = 0;
  let images = 0;

  const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  const block = (x: unknown): TextBlock | ImageBlock | null => {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    if (o.type === 'text' && typeof o.text === 'string') {
      chars += o.text.length;
      const cc = o.cache_control && typeof o.cache_control === 'object' ? { type: 'ephemeral' as const } : undefined;
      return cc ? { type: 'text', text: o.text, cache_control: cc } : { type: 'text', text: o.text };
    }
    if (o.type === 'image' && o.source && typeof o.source === 'object') {
      const s = o.source as Record<string, unknown>;
      if (s.type !== 'base64' || typeof s.media_type !== 'string' || !IMAGE_TYPES.has(s.media_type) || typeof s.data !== 'string') return null;
      if (s.data.length > MAX_IMAGE_B64) return null;
      images++;
      return { type: 'image', source: { type: 'base64', media_type: s.media_type, data: s.data } };
    }
    return null;
  };

  let system: string | TextBlock[] = '';
  if (typeof b.system === 'string') {
    system = b.system;
    chars += system.length;
  } else if (Array.isArray(b.system)) {
    const blocks = b.system.map(block);
    if (blocks.some((x) => !x || x.type !== 'text')) return { error: 'bad-request' };
    system = blocks as TextBlock[];
  } else if (b.system != null) return { error: 'bad-request' };

  const messages: CleanRequest['messages'] = [];
  for (const m of b.messages) {
    if (!m || typeof m !== 'object') return { error: 'bad-request' };
    const mm = m as Record<string, unknown>;
    if (mm.role !== 'user' && mm.role !== 'assistant') return { error: 'bad-request' };
    const t = text(mm.content);
    if (t !== null) {
      chars += t.length;
      messages.push({ role: mm.role, content: t });
      continue;
    }
    if (!Array.isArray(mm.content)) return { error: 'bad-request' };
    const blocks = mm.content.map(block);
    if (blocks.some((x) => !x)) return { error: 'bad-request' };
    messages.push({ role: mm.role, content: blocks as (TextBlock | ImageBlock)[] });
  }
  if (chars > MAX_TEXT_CHARS || images > MAX_IMAGES) return { error: 'too-large' };

  const requested = typeof b.max_tokens === 'number' && Number.isFinite(b.max_tokens) ? Math.floor(b.max_tokens) : MAX_TOKENS_CAP;
  return { model: b.model, max_tokens: Math.max(1, Math.min(MAX_TOKENS_CAP, requested)), system, messages, images };
}
