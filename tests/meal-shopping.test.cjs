const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { appendMeal, removePlannedMeal, localDateKey, shiftPlanDays, retainMealDetails } = require('../utils/meal-planning.ts');
const { buildShoppingList } = require('../utils/shopping-list.ts');
const rice = { id: 'rice', name: 'Riz', servings: 4, ingredients: [{ name: 'Riz', quantity: '500 g' }, { name: 'Sel', quantity: 'Au goût' }] };
const catalogue = { rice };
test('manual planning preserves existing meals and extends date range without mutation', () => {
  const original = appendMeal(null, '2026-10-20', { recipeId: 'rice', label: 'Dîner', servings: 2 });
  const updated = appendMeal(original, '2026-10-18', { recipeId: 'rice', label: 'Déjeuner', servings: 6 });
  assert.equal(updated.id, original.id);
  assert.equal(updated.startDate, '2026-10-18');
  assert.equal(updated.endDate, '2026-10-20');
  assert.equal(Object.keys(original.days).length, 1);
  assert.equal(updated.days['2026-10-18'].meals[0].servings, 6);
});
test('removing final meal clears plan; removing a boundary day recomputes range', () => {
  const first = appendMeal(null, '2026-10-18', { recipeId: 'rice', label: 'Lunch' });
  const plan = appendMeal(first, '2026-10-20', { recipeId: 'rice', label: 'Dinner' });
  const updated = removePlannedMeal(plan, '2026-10-18', 0);
  assert.equal(updated.startDate, '2026-10-20');
  assert.equal(removePlannedMeal(updated, '2026-10-20', 0), null);
});
test('local date keys match the local calendar near midnight', () => {
  assert.equal(localDateKey(new Date(2026, 9, 18, 0, 5)), '2026-10-18');
});
test('direct shopping works without a plan and scales portions', () => {
  const list = buildShoppingList(null, [{ id: 'one', recipeId: 'rice', servings: 2 }], catalogue, catalogue);
  assert.equal(list.find(i => i.name === 'Riz').quantity, '250 g');
  assert.equal(list.find(i => i.name === 'Sel').quantity, 'Au goût');
});
test('repeated meals retain both ingredient quantities', () => {
  const plan = appendMeal(appendMeal(null, '2026-10-18', { recipeId: 'rice', label: 'Lunch' }), '2026-10-18', { recipeId: 'rice', label: 'Dinner' });
  assert.equal(buildShoppingList(plan, [], catalogue, catalogue).find(i => i.name === 'Riz').quantity, '500 g + 500 g');
});
test('checkbox identities survive language changes but reset when needs change', () => {
  const selections = [{ id: 'one', recipeId: 'rice', servings: 4 }];
  const english = { rice: { ...rice, name: 'Rice', ingredients: [{ name: 'Rice', quantity: '500 g' }, { name: 'Salt', quantity: 'To taste' }] } };
  const fr = buildShoppingList(null, selections, catalogue, catalogue).find(i => i.name === 'Riz');
  const en = buildShoppingList(null, selections, english, catalogue).find(i => i.name === 'Rice');
  assert.equal(fr.key, en.key);
  const more = buildShoppingList(null, [...selections, { id: 'two', recipeId: 'rice', servings: 4 }], catalogue, catalogue).find(i => i.name === 'Riz');
  assert.notEqual(fr.key, more.key);
});
test('deleted recipes do not break shopping list', () => {
  assert.deepEqual(buildShoppingList(null, [{ id: 'one', recipeId: 'deleted', servings: 4 }], catalogue, catalogue), []);
});

test('reusing a sparse plan keeps three-day gaps across month boundaries', () => {
  const days = { '2026-10-20': { meals: [] }, '2026-10-23': { meals: [] } };
  assert.deepEqual(Object.keys(shiftPlanDays(days, new Date(2026, 9, 30))), ['2026-10-30', '2026-11-02']);
});
test('AI adjustment retains portions when changing a dish in a named meal', () => {
  const previous = { '2026-10-20': { meals: [{ recipeId: 'rice', label: 'Dinner', slot: 'dinnerMeal', servings: 6 }] } };
  const next = { '2026-10-20': { meals: [{ recipeId: 'beans', label: 'Dinner' }] } };
  assert.equal(retainMealDetails(previous, next)['2026-10-20'].meals[0].servings, 6);
  assert.equal(retainMealDetails(previous, next)['2026-10-20'].meals[0].slot, 'dinnerMeal');
});
