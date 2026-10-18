import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createLiveQuota, LiveQuotaError } from '../lib/live/quota.ts';
const source = await readFile(new URL('../utils/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const body = { model: 'claude-haiku-4-5-20251001', system: 'Cook', messages: [{ role: 'user', content: 'Question' }], max_tokens: 256 };
function setup(fetch, { consent = true, allow = true, fastTimeout = false } = {}) {
  const data = new Map(); const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, val) => data.set(key, val), removeItem: async key => data.delete(key) };
  const quota = createLiveQuota(storage);
  class ProRequiredError extends Error { constructor() { super('pro-required'); } }
  const mocks = {
    '@react-native-async-storage/async-storage': { default: storage, __esModule: true },
    '@/constants/api': { API_BASE_URL: 'https://test.invalid' },
    './aiConsentBridge': { requestAiConsent: async () => consent, AiConsentError: class extends Error { constructor() { super('consent'); } } },
    './proBridge': { assertAiAllowed: () => { if (!allow) throw new ProRequiredError(); }, consumeFreeChat: () => {}, openPaywallFromServer: () => {}, ProRequiredError },
    '@/lib/pro': { fetchWithDeviceRetry: f => f(), proHeaders: () => ({}) },
    '@/services/liveQuota': { liveQuota: quota },
    '@/lib/live/quota': { LiveQuotaError },
  };
  const mod = { exports: {} };
  new Function('require','module','exports','fetch','setTimeout','clearTimeout',compiled)(name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; },mod,mod.exports,fetch,(fn,ms) => setTimeout(fn,fastTimeout ? 5 : ms),clearTimeout);
  return { api: mod.exports, quota };
}
test('transport: successful Live request reserves local quota and returns full text', async () => {
  let calls = 0; const { api, quota } = setup(async (_url, options) => { calls++; assert.ok(options.signal); return Response.json({ content: [{ type: 'text', text: 'Une' }, { type: 'text', text: 'réponse' }] }); });
  const usage = []; assert.equal(await api.callClaudeLive(body, 'live-cooking', { onUsage: value => usage.push(value) }), 'Une\nréponse');
  assert.equal(calls, 1); assert.equal((await quota.getUsage()).used, 1); assert.equal(usage.at(-1).remaining, 99);
});
test('transport: HTTP refusal refunds the local response and photo', async () => {
  const { api, quota } = setup(async () => Response.json({ error: 'ai-failed' }, { status: 502 }));
  const photo = { ...body, messages: [{ role: 'user', content: [{ type: 'text', text: 'Photo' }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAA' } }] }] };
  await assert.rejects(api.callClaudeLive(photo, 'live-cooking'), /ai-failed/);
  const usage = await quota.getUsage(); assert.equal(usage.used, 0); assert.equal(usage.photosUsed, 0);
});
test('transport: consent and Pro checks occur before any local charge or network', async () => {
  for (const options of [{ consent: false }, { allow: false }]) {
    let calls = 0; const { api, quota } = setup(async () => { calls++; }, options);
    await assert.rejects(api.callClaudeLive(body, 'live-cooking')); assert.equal(calls, 0); assert.equal((await quota.getUsage()).used, 0);
  }
});
test('transport: cancelling after dispatch aborts HTTP and retains one consumed response', async () => {
  let dispatched; const ready = new Promise(resolve => { dispatched = resolve; });
  const { api, quota } = setup((_url, options) => new Promise((_, reject) => { dispatched(); options.signal.addEventListener('abort', () => reject(new Error('aborted'))); }));
  const ctrl = new AbortController(); const result = api.callClaudeLive(body, 'live-cooking', { signal: ctrl.signal }); await ready; ctrl.abort();
  await assert.rejects(result, /aborted/); assert.equal((await quota.getUsage()).used, 1);
  const next = await quota.reserve(false); await next.finish(true); // The aborted call released its in-process lock.
});
test('transport: timeout is actionable and still releases the local lock', async () => {
  const { api, quota } = setup((_url, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))), { fastTimeout: true });
  await assert.rejects(api.callClaudeLive(body, 'live-cooking'), /timeout/); assert.equal((await quota.getUsage()).used, 1);
  const next = await quota.reserve(false); await next.finish(true);
});
