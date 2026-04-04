import type { VercelRequest, VercelResponse } from '@vercel/node';

const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY;
const CHARIOW_API_URL = 'https://api.chariow.com/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (!CHARIOW_API_KEY) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  const { licenseKey } = req.body;

  if (!licenseKey || typeof licenseKey !== 'string') {
    res.status(400).json({ error: 'Missing licenseKey' });
    return;
  }

  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CHARIOW_API_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        res.json({ valid: false, status: 'invalid', error: 'License not found' });
        return;
      }
      const errorText = await response.text();
      res.status(response.status).json({ valid: false, status: 'error', error: errorText });
      return;
    }

    const data = await response.json();
    const license = data.data;

    res.json({
      valid: license.is_active && !license.is_expired,
      status: !license.is_active ? 'inactive' : license.is_expired ? 'expired' : license.status === 'revoked' ? 'revoked' : 'active',
      license: {
        key: license.key,
        status: license.status,
        isActive: license.is_active,
        isExpired: license.is_expired,
        expiresAt: license.expires_at,
        activations: license.activations ?? null,
      },
    });
  } catch (err) {
    console.error('Validate license error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
