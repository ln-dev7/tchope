import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const appJson = JSON.parse(readFileSync(resolve(__dirname, '../app.json'), 'utf-8'));
const APP_VERSION: string = appJson.expo.version;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY;
const CHARIOW_API_URL = 'https://api.chariow.com/v1';

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

// License validation proxy
app.post('/api/validate-license', async (req, res) => {
  if (!CHARIOW_API_KEY) {
    res.status(500).json({ error: 'CHARIOW_API_KEY not configured' });
    return;
  }

  const { licenseKey } = req.body;
  if (!licenseKey) {
    res.status(400).json({ error: 'Missing licenseKey' });
    return;
  }

  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}`, {
      headers: { Authorization: `Bearer ${CHARIOW_API_KEY}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) { res.json({ valid: false, status: 'invalid' }); return; }
      res.status(response.status).json({ valid: false, status: 'error' });
      return;
    }

    const data = await response.json();
    const l = data.data;
    res.json({
      valid: l.is_active && !l.is_expired,
      status: !l.is_active ? 'inactive' : l.is_expired ? 'expired' : l.status === 'revoked' ? 'revoked' : 'active',
      license: { key: l.key, status: l.status, isActive: l.is_active, isExpired: l.is_expired, expiresAt: l.expires_at, activations: l.activations ?? null },
    });
  } catch (err) {
    console.error('Validate license error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// License activation proxy
app.post('/api/activate-license', async (req, res) => {
  if (!CHARIOW_API_KEY) {
    res.status(500).json({ error: 'CHARIOW_API_KEY not configured' });
    return;
  }

  const { licenseKey, deviceId } = req.body;
  if (!licenseKey || !deviceId) {
    res.status(400).json({ error: 'Missing licenseKey or deviceId' });
    return;
  }

  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHARIOW_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device_identifier: deviceId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 422 || (err.message && err.message.toLowerCase().includes('limit'))) {
        res.json({ success: false, error: 'device_limit' }); return;
      }
      if (response.status === 404) { res.json({ success: false, error: 'invalid' }); return; }
      res.status(response.status).json({ success: false, error: err.message || 'Activation failed' });
      return;
    }

    const data = await response.json();
    const a = data.data;
    res.json({ success: true, deviceIdentifier: a.device_identifier, activationsRemaining: a.activations?.remaining ?? null });
  } catch (err) {
    console.error('Activate license error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// License deactivation proxy
app.post('/api/deactivate-license', async (req, res) => {
  if (!CHARIOW_API_KEY) { res.status(500).json({ error: 'CHARIOW_API_KEY not configured' }); return; }
  const { licenseKey, deviceId } = req.body;
  if (!licenseKey || !deviceId) { res.status(400).json({ error: 'Missing licenseKey or deviceId' }); return; }
  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHARIOW_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device_identifier: deviceId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json({ success: false, error: err.message || 'Deactivation failed' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Deactivate license error:', err);
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
