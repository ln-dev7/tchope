import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const appJson = JSON.parse(readFileSync(resolve(__dirname, '../app.json'), 'utf-8'));
const APP_VERSION: string = appJson.expo.version;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

// Proxy endpoint for all Claude API calls
app.post('/api/claude', async (req, res) => {
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
        'x-api-key': ANTHROPIC_API_KEY!,
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
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Returns the minimum required app version (synced from app.json)
app.get('/api/version', (_req, res) => {
  res.json({
    minVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    forceUpdate: false,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tchope API proxy running on port ${PORT}`);
});
