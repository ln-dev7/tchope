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

  const { licenseKey, deviceId } = req.body;

  if (!licenseKey || typeof licenseKey !== 'string') {
    res.status(400).json({ error: 'Missing licenseKey' });
    return;
  }
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'Missing deviceId' });
    return;
  }

  try {
    const response = await fetch(`${CHARIOW_API_URL}/licenses/${encodeURIComponent(licenseKey)}/activate`, {
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
      const errorMsg = errorData.message || `Activation failed: ${response.status}`;

      if (response.status === 422 || errorMsg.toLowerCase().includes('limit')) {
        res.json({ success: false, error: 'device_limit' });
        return;
      }
      if (response.status === 404) {
        res.json({ success: false, error: 'invalid' });
        return;
      }
      res.status(response.status).json({ success: false, error: errorMsg });
      return;
    }

    const data = await response.json();
    const activation = data.data;

    res.json({
      success: true,
      deviceIdentifier: activation.device_identifier,
      activationsRemaining: activation.activations?.remaining ?? null,
    });
  } catch (err) {
    console.error('Activate license error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
