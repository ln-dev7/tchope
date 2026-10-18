// Règles Tchopé Pro côté app (utils/proBridge.ts) : 3 messages de chat gratuits, tout le reste Pro. `npm run test:pro`.
import assert from 'node:assert/strict';
const m = await import('../utils/proBridge.ts');
let pro = false, used = 0; const opened: string[] = []; const refused: string[] = [];
m.registerProBridge({ isPro: () => pro, freeChatLeft: () => Math.max(0, 3 - used), consumeChat: () => { used++; }, openPaywall: (r) => opened.push(r), serverRefused: (r) => refused.push(r) });
// gratuit : 3 messages de chat
for (let i = 0; i < 3; i++) { assert.equal(m.requireAi('chat'), true); m.consumeFreeChat('chat'); }
assert.equal(m.requireAi('chat'), false); assert.deepEqual(opened, ['chat']);
// toutes les autres fonctions : Pro
for (const f of ['chat-photo','ingredients','search','plan','plan-adjust','live-cooking']) assert.equal(m.requireAi(f), false, f);
assert.equal(opened.length, 7); assert.ok(opened.slice(1).every((r) => r === 'feature'));
assert.throws(() => m.assertAiAllowed('search'), (e) => m.isProRequired(e));
// consommer ne vaut que pour le chat
m.consumeFreeChat('search'); assert.equal(used, 3);
// abonné : tout passe, rien ne s'ouvre
pro = true; opened.length = 0;
for (const f of ['chat','chat-photo','ingredients','search','plan','plan-adjust','live-cooking']) assert.equal(m.requireAi(f), true, f);
assert.equal(opened.length, 0);
// refus serveur → serverRefused
m.openPaywallFromServer('plan'); m.openPaywallFromServer('chat'); assert.deepEqual(refused, ['feature','chat']);
console.log('proBridge OK');
