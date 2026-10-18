import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { create, act } from 'react-test-renderer';
import ts from 'typescript';
import * as coordinator from '../lib/live/session.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../hooks/useSpeechRecognition.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
async function mount() {
  const events = new Map(); let stops = 0, aborts = 0;
  const native = {
    isRecognitionAvailable: () => true,
    addListener: (name, fn) => { events.set(name, fn); return { remove: () => events.delete(name) }; },
    start: () => events.get('start')?.({}), stop: () => { stops++; }, abort: () => { aborts++; },
    getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
    requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => name === 'expo-speech-recognition' ? { ExpoSpeechRecognitionModule: native } : name === '@/lib/live/session' ? coordinator : require(name), mod, mod.exports);
  let hook; const Component = () => { hook = mod.exports.useSpeechRecognition('fr-FR'); return null; };
  let renderer; await act(async () => { renderer = create(React.createElement(Component)); });
  return { get hook() { return hook; }, events, native, get stops() { return stops; }, get aborts() { return aborts; }, unmount: () => act(async () => renderer.unmount()) };
}
test('micro: release awaits final native result/end instead of stale React transcript', async () => {
  const m = await mount();
  await act(async () => { assert.equal(m.hook.startListening(), true); m.events.get('result')({ results: [{ transcript: 'Comment' }], isFinal: false }); });
  let resolved = false; let pending;
  await act(async () => { pending = m.hook.stopListening().then(text => { resolved = true; return text; }); });
  assert.equal(m.stops, 1); assert.equal(resolved, false);
  await act(async () => { m.events.get('result')({ results: [{ transcript: 'Comment cuire mon ndolé ?' }], isFinal: true }); m.events.get('end')({}); });
  assert.equal(await pending, 'Comment cuire mon ndolé ?'); assert.equal(m.hook.state, 'inactive'); await m.unmount();
});
test('micro: cancel settles pending stop and ignores late native results', async () => {
  const m = await mount(); let pending;
  await act(async () => { m.hook.startListening(); pending = m.hook.stopListening(); m.hook.abortListening(); m.events.get('result')({ results: [{ transcript: 'late' }], isFinal: true }); m.events.get('end')({}); });
  assert.equal(await pending, ''); assert.equal(m.hook.transcript, ''); assert.equal(m.hook.state, 'inactive'); await m.unmount();
});
test('micro: OS error settles the turn, clears audio and permits a new recording', async () => {
  const m = await mount(); let pending;
  await act(async () => { m.hook.startListening(); pending = m.hook.stopListening(); m.events.get('error')({ error: 'audio-capture' }); });
  assert.equal(await pending, ''); assert.equal(m.hook.error, 'audio-capture'); assert.equal(m.hook.volume, 0);
  await act(async () => { assert.equal(m.hook.startListening(), true); }); assert.equal(m.hook.error, null); await m.unmount();
});
test('micro: unmount aborts native recording and removes all subscriptions', async () => {
  const m = await mount(); let pending;
  await act(async () => { m.hook.startListening(); pending = m.hook.stopListening(); });
  await m.unmount(); assert.equal(await pending, ''); assert.equal(m.events.size, 0); assert.ok(m.aborts >= 1);
});
test('micro: permanent permission denial is returned for the Settings action', async () => {
  const m = await mount(); assert.deepEqual(await m.hook.checkPermissions(), { granted: false, canAskAgain: false }); await m.unmount();
});
