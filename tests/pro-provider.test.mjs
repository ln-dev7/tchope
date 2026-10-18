import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';
import * as bridge from '../utils/proBridge.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../context/ProContext.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

async function mount({ dev = true, subscribed = false, saved = null, usage = 3, storage = null } = {}) {
  const data = storage ?? new Map([['tchope_pro_dev', saved], ['tchope_pro_usage', JSON.stringify({ chat: usage })]]);
  const reads = [];
  const writes = [];
  const alerts = [];
  let onChange;
  const state = () => ({ pro: subscribed, managementURL: 'https://apps.apple.com/account/subscriptions' });
  const sdk = {
    FREE_CHAT_MESSAGES: 3,
    configurePurchases: async listener => { onChange = listener; return true; },
    fetchPro: async () => state(),
    fetchOffer: async () => ({ price: '$2.99', pkg: {} }),
    restore: async () => state(),
    purchase: async () => 'purchased',
  };
  const mocks = {
    'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    '@react-native-async-storage/async-storage': {
      getItem: async key => { reads.push(key); return data.get(key) ?? null; },
      setItem: async (key, value) => { writes.push([key, value]); data.set(key, value); },
    },
    '@/context/SettingsContext': { useSettings: () => ({ settings: { language: 'fr' } }) },
    '@/constants/pro-translations': { proDict: { fr: { block: 'Pro', errPro: 'Restore purchases' } } },
    '@/lib/pro': sdk,
    '@/utils/proBridge': bridge,
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', compiled)(
    name => mocks[name] ?? require(name), mod, mod.exports, dev,
  );
  let context;
  const Consumer = () => { context = mod.exports.usePro(); return null; };
  let renderer;
  await act(async () => { renderer = create(React.createElement(mod.exports.ProProvider, null, React.createElement(Consumer))); });
  return {
    get ctx() { return context; }, data, reads, writes, alerts,
    updateStore: async pro => { subscribed = pro; await act(async () => onChange(state())); },
    unmount: () => act(async () => renderer.unmount()),
  };
}

test('a paid user can force free mode, see the paywall and return to their actual subscription', async () => {
  const app = await mount({ subscribed: true });
  assert.equal(app.ctx.pro, true);
  await act(async () => app.ctx.setDevIgnoreStore(true));
  assert.equal(app.ctx.pro, false);
  assert.equal(app.ctx.devPro, false);
  await act(async () => assert.equal(bridge.requireAi('plan'), false));
  assert.equal(app.ctx.paywall, 'feature');
  await app.updateStore(true);
  await act(async () => assert.equal(await app.ctx.restorePurchases(), true));
  assert.equal(app.ctx.pro, false, 'RevenueCat refresh/restore must not override the simulation');
  await act(async () => app.ctx.setDevIgnoreStore(false));
  assert.equal(app.ctx.pro, true);
  assert.equal(bridge.requireAi('plan'), true);
  await app.unmount();
});

test('Pro and free simulations are mutually exclusive and preserve the free chat allowance', async () => {
  const app = await mount({ usage: 1 });
  await act(async () => app.ctx.setDevPro(true));
  assert.equal(app.ctx.pro, true);
  assert.equal(bridge.requireAi('chat-photo'), true);
  await act(async () => bridge.consumeFreeChat('chat'));
  assert.equal(app.ctx.freeChatLeft, 2, 'simulating Pro must not consume the free trial');
  await act(async () => app.ctx.setDevIgnoreStore(true));
  assert.equal(app.ctx.pro, false);
  assert.equal(app.ctx.devPro, false);
  assert.equal(app.ctx.devIgnoreStore, true);
  assert.equal(bridge.requireAi('chat'), true, 'forced free keeps the real trial allowance');
  await act(async () => app.ctx.setDevPro(true));
  assert.equal(app.ctx.devIgnoreStore, false);
  await act(async () => app.ctx.setDevPro(false));
  assert.equal(app.ctx.pro, false);
  assert.equal(app.ctx.freeChatLeft, 2);
  await app.unmount();
});

test('the last mode survives restart and legacy Pro preferences still work', async () => {
  const app = await mount({ subscribed: true, saved: '1' });
  assert.equal(app.ctx.devPro, true);
  await act(async () => {
    app.ctx.setDevIgnoreStore(true);
    app.ctx.setDevPro(true);
    app.ctx.setDevIgnoreStore(true);
  });
  assert.equal(app.data.get('tchope_pro_dev'), 'free');
  await app.unmount();
  const restarted = await mount({ subscribed: true, storage: app.data });
  assert.equal(restarted.ctx.devIgnoreStore, true);
  assert.equal(restarted.ctx.pro, false);
  await restarted.unmount();
});

test('release builds ignore persisted overrides and both developer setters', async () => {
  for (const subscribed of [true, false]) {
    for (const saved of ['1', 'pro', 'free']) {
      const app = await mount({ dev: false, subscribed, saved });
      assert.equal(app.ctx.pro, subscribed);
      assert.equal(app.ctx.devPro, false);
      assert.equal(app.ctx.devIgnoreStore, false);
      assert.ok(!app.reads.includes('tchope_pro_dev'));
      await act(async () => { app.ctx.setDevPro(true); app.ctx.setDevIgnoreStore(true); });
      assert.equal(app.ctx.pro, subscribed);
      assert.equal(app.writes.length, 0);
      await app.unmount();
    }
  }
});

test('simulating Pro does not suppress a subscription refusal from the server', async () => {
  const app = await mount({ saved: 'pro' });
  await act(async () => bridge.openPaywallFromServer('plan'));
  assert.deepEqual(app.alerts, [['Pro', 'Restore purchases']]);
  assert.equal(app.ctx.paywall, null);
  await app.unmount();
});
