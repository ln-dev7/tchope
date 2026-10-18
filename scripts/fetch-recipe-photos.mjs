// Télécharge les photos de recettes retenues (scripts/recipe-photos.json), les met au format de l'app
// (WebP, 800 px de large, proportions gardées) dans assets/images/recipes/<id>.webp, puis régénère
// constants/localImages.ts (toutes les photos locales) et constants/photoCredits.ts (auteurs et licences).
// À lancer sur le Mac (accès internet) : `npm run photos`. Option : `npm run photos -- ndole eru` (quelques plats).
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets/images/recipes');
const manifest = JSON.parse(await readFile(path.join(root, 'scripts/recipe-photos.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
await mkdir(outDir, { recursive: true });

const UA = 'TchopePhotos/1.0 (https://tchope.lndev.me; leonelngoya@gmail.com)';
let ok = 0;
const failed = [];
for (const p of manifest.photos) {
  if (only.size && !only.has(p.id)) continue;
  try {
    const res = await fetch(p.image_url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).rotate().resize({ width: 800 }).webp({ quality: 78 }).toFile(path.join(outDir, `${p.id}.webp`));
    ok++;
    console.log(`✓ ${p.id}`);
  } catch (e) {
    failed.push(p.id);
    console.log(`✗ ${p.id} : ${e.message}`);
  }
}

// constants/localImages.ts : chaque fichier présent dans assets/images/recipes.
const files = (await readdir(outDir)).filter((f) => f.endsWith('.webp')).sort();
const lines = files.map((f) => `  '${f.replace(/\.webp$/, '')}': require('@/assets/images/recipes/${f}'),`);
await writeFile(
  path.join(root, 'constants/localImages.ts'),
  `// Photos des recettes intégrées à l'app (générées par scripts/fetch-recipe-photos.mjs, ne pas éditer à la main).\n` +
    `// Crédits et licences : constants/photoCredits.ts.\nexport const localRecipeImages: Record<string, number> = {\n${lines.join('\n')}\n};\n`
);

// constants/photoCredits.ts : obligatoire pour les licences CC BY / CC BY-SA (écran « Crédits photos »).
const credits = manifest.photos
  .filter((p) => files.includes(`${p.id}.webp`))
  .map((p) => ({ id: p.id, author: p.author, license: p.license, source: p.source, url: p.page_url }));
await writeFile(
  path.join(root, 'constants/photoCredits.ts'),
  `// Auteurs et licences des photos de recettes (générés par scripts/fetch-recipe-photos.mjs, ne pas éditer à la main).\n` +
    `export interface PhotoCredit { id: string; author: string; license: string; source: string; url: string }\n` +
    `export const photoCredits: PhotoCredit[] = ${JSON.stringify(credits, null, 2)};\n`
);

console.log(`\n${ok} photo(s) téléchargée(s)${failed.length ? `, échecs : ${failed.join(', ')}` : ''}.`);
if (failed.length) process.exitCode = 1;
