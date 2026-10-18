// Ancienne API (versions ≤ 1.10) : toute demande d'IA reçoit « mettez à jour » avec le bon store. `npm test` (Node 22+).
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(tmpdir(), 'tchope-legacy-'));
await mkdir(path.join(dir, 'api'));
await mkdir(path.join(dir, 'lib'));
for (const f of ['api/claude.ts', 'api/fetch-recipe-url.ts', 'lib/http.ts']) {
  const src = (await readFile(path.join(root, f), 'utf8')).replace("from '../lib/http'", "from '../lib/http.ts'");
  await writeFile(path.join(dir, f), src);
}
const { default: claude } = await import(pathToFileURL(path.join(dir, 'api/claude.ts')).href);
const { default: url } = await import(pathToFileURL(path.join(dir, 'api/fetch-recipe-url.ts')).href);

const run = (handler, method, ua) => {
  const out = { status: 0, body: null };
  const res = {
    setHeader() {},
    status(code) { out.status = code; return this; },
    json(b) { out.body = b; return this; },
    end() { return this; },
  };
  handler({ method, headers: ua ? { 'user-agent': ua } : {} }, res);
  return out;
};

let r = run(claude, 'POST', 'Tchope/32 CFNetwork/1568 Darwin/24.0.0');
assert.equal(r.status, 200);
assert.match(r.body.content[0].text, /apps\.apple\.com\/app\/tchope\/id6791111069/);
r = run(claude, 'POST', 'okhttp/4.12.0');
assert.match(r.body.content[0].text, /play\.google\.com\/store\/apps\/details\?id=com\.lndev\.tchope/);
assert.doesNotMatch(r.body.content[0].text, /apps\.apple\.com/);
assert.equal(run(claude, 'GET').status, 405);
assert.deepEqual(run(url, 'POST').body, { error: 'update-app' });
await rm(dir, { recursive: true, force: true });
console.log('ancienne API : 4 vérifications OK');
