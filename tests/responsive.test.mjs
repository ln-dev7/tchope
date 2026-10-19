// Geometry regression checks: changing scenes, asymmetric system UI and larger text.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/responsive-layout.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { responsiveLayout } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const none = { top: 0, bottom: 0, left: 0, right: 0 };
let cases = 0;
for (const [width, height] of [[320, 568], [390, 844], [440, 680], [680, 440], [466, 678], [951, 669], [900, 650], [650, 900], [1024, 1366], [1366, 1024]]) {
  for (const insets of [none, { top: 62, bottom: 90, left: 0, right: 0 }, { top: 0, bottom: 34, left: 0, right: 88 }, { top: 0, bottom: 34, left: 88, right: 0 }]) {
    for (const fontScale of [1, 1.3, 2]) {
      const layout = responsiveLayout(width, height, insets, fontScale);
      for (const surface of [layout.readable, layout.page]) {
        // Yoga centers the margin box; the actual content must remain inside each safe edge.
        const x = (width - surface.width - surface.marginLeft - surface.marginRight) / 2 + surface.marginLeft;
        assert.ok(x >= insets.left, 'left system region is clear');
        assert.ok(x + surface.width <= width - insets.right, 'right system region is clear');
        assert.ok(surface.width > 0);
      }
      const cardWidth = (layout.pageWidth - 40 - 16 * (layout.gridCols - 1)) / layout.gridCols;
      assert.ok(cardWidth >= 144, `readable cards: ${width}/${fontScale}`);
      assert.ok(layout.contentWidth <= 720 && layout.pageWidth <= 840);
      assert.equal(layout.safeHeight, height - insets.top - insets.bottom);
      cases++;
    }
  }
}
const open = responsiveLayout(951, 669, { ...none, right: 84, bottom: 34 });
const folded = responsiveLayout(466, 678, { ...none, right: 84, bottom: 34 });
assert.ok(open.gridCols > folded.gridCols, 'unfolding increases columns');
assert.deepEqual(responsiveLayout(951, 669, { ...none, right: 84, bottom: 34 }), open, 'returning to a posture restores its layout');
assert.ok(responsiveLayout(1000, 700, none, 2).gridCols < responsiveLayout(1000, 700, none).gridCols, 'large text gets wider cards');
console.log(`✓ ${cases} responsive geometry cases + posture and text-size transitions`);
