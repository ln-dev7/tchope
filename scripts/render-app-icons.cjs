// Re-render approved SVG masters. Requires the sharp development dependency.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.join(__dirname, '../assets/app-icons');
(async () => {
  for (const id of fs.readdirSync(root)) {
    for (const part of ['master', 'foreground', 'background', 'monochrome']) {
      const source = path.join(root, id, part + '.svg');
      if (!fs.existsSync(source)) continue;
      let image = sharp(source).resize(1024, 1024);
      if (part === 'master' || part === 'background') image = image.removeAlpha();
      await image.png().toFile(path.join(root, id, (part === 'master' ? 'icon' : part) + '.png'));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
