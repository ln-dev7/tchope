// Télécharge les photos de recettes retenues (scripts/recipe-photos.json), les met au format de l'app
// (WebP, 800 px de large au plus, proportions gardées) dans assets/images/recipes/<id>.webp, puis régénère
// constants/localImages.ts (toutes les photos locales) et constants/photoCredits.ts (auteurs et licences,
// affichés dans Réglages → Crédits photos).
//
// Deux sortes d'entrées dans recipe-photos.json :
//   { "id": "ndole", "commons": "Nom du fichier.jpg" }  → Wikimedia Commons : URL, auteur et licence sont lus
//      sur l'API Commons au moment du téléchargement (aucune licence recopiée à la main) ; une licence non libre
//      fait échouer la photo.
//   { "id": "...", "image_url", "page_url", "source", "license", "author" } → Pexels, Unsplash, Pixabay.
// Champ facultatif "note" : photo gardée faute de mieux (à remplacer dès qu'une photo libre exacte existe).
//
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

const UA = 'TchopePhotos/1.1 (https://tchope.lndev.me; leonelngoya@gmail.com)';
const FREE = /^(CC0|CC BY(-SA)? \d|CC BY(-SA)?$|Public domain|PD|No restrictions|Attribution)/i;
const strip = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Métadonnées Commons (URL d'une vignette de 1280 px (taille standard de Commons), auteur, licence), par lots de 40 fichiers. */
async function commonsInfo(files) {
  const info = new Map();
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
      '&iiprop=url|size|extmetadata&iiurlwidth=1280&titles=' +
      encodeURIComponent(batch.map((f) => `File:${f}`).join('|'));
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`API Commons : HTTP ${res.status}`);
    const json = await res.json();
    const from = new Map((json.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(json.query.pages)) {
      const name = (from.get(page.title) ?? page.title).replace(/^File:/, '');
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const meta = ii.extmetadata ?? {};
      info.set(name, {
        image_url: ii.width > 1280 ? ii.thumburl : ii.url,
        page_url: ii.descriptionurl,
        license: strip(meta.LicenseShortName?.value) || 'inconnue',
        author: strip(meta.Artist?.value).slice(0, 80) || 'Wikimedia Commons',
        source: 'Wikimedia Commons',
      });
    }
  }
  return info;
}

const todo = manifest.photos.filter((p) => !only.size || only.has(p.id));
const commons = await commonsInfo([...new Set(todo.filter((p) => p.commons).map((p) => p.commons))]);

let ok = 0;
const failed = [];
const credits = new Map();
for (const p of todo) {
  try {
    const meta = p.commons ? commons.get(p.commons) : p;
    if (!meta) throw new Error(`fichier introuvable sur Commons : ${p.commons}`);
    if (p.commons && !FREE.test(meta.license)) throw new Error(`licence non libre : ${meta.license}`);
    let url = meta.image_url;
    if (url.includes('images.pexels.com')) url = `${url.split('?')[0]}?auto=compress&w=1600`;
    if (url.includes('images.unsplash.com')) url = `${url.split('?')[0]}?w=1600&fm=jpg&q=85`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(outDir, `${p.id}.webp`));
    credits.set(p.id, { id: p.id, author: meta.author, license: meta.license, source: meta.source, url: meta.page_url });
    ok++;
    console.log(`✓ ${p.id}${p.note ? '  (à remplacer plus tard)' : ''}`);
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
// Un lancement partiel (`npm run photos -- ndole`) garde les crédits déjà écrits pour les autres plats.
const creditsFile = path.join(root, 'constants/photoCredits.ts');
try {
  const previous = (await readFile(creditsFile, 'utf8')).match(/= (\[[\s\S]*\]);/);
  for (const c of previous ? JSON.parse(previous[1]) : []) if (!credits.has(c.id)) credits.set(c.id, c);
} catch {
  // pas encore de fichier
}
const sorted = [...credits.values()].filter((c) => files.includes(`${c.id}.webp`)).sort((a, b) => a.id.localeCompare(b.id));
await writeFile(
  creditsFile,
  `// Auteurs et licences des photos de recettes (générés par scripts/fetch-recipe-photos.mjs, ne pas éditer à la main).\n` +
    `export interface PhotoCredit { id: string; author: string; license: string; source: string; url: string }\n` +
    `export const photoCredits: PhotoCredit[] = ${JSON.stringify(sorted, null, 2)};\n`
);

console.log(`\n${ok} photo(s) téléchargée(s)${failed.length ? `, échecs : ${failed.join(', ')}` : ''}.`);
if (failed.length) process.exitCode = 1;
