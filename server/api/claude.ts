import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ANTHROPIC_URL } from '../config';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  const { model, max_tokens, system, messages } = req.body;

  if (!model || !messages) {
    res.status(400).json({ error: 'Missing required fields: model, messages' });
    return;
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
      body: JSON.stringify({ model, max_tokens: max_tokens ?? 2048, system, messages }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      res.status(response.status).json({ error: `Anthropic API error: ${response.status}`, details: errorBody });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
