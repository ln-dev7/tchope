const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type ClaudeRequest = {
  model: string;
  max_tokens?: number;
  system: string;
  messages: { role: string; content: string }[];
};

export async function callClaude(params: ClaudeRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}
