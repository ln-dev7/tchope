import type { VercelRequest, VercelResponse } from '@vercel/node';

const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY;
const CHARIOW_API_URL = 'https://api.chariow.com/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!CHARIOW_API_KEY) { res.status(500).json({ error: 'API key not configured' }); return; }

  const { licenseKey, deviceId } = req.body;
  if (!licenseKey || !deviceId) { res.status(400).json({ error: 'Missing licenseKey or deviceId' }); return; }

  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}/deactivate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ device_identifier: deviceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res.status(response.status).json({ success: false, error: errorData.message || 'Deactivation failed' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Deactivate license error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
