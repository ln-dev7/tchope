import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const sources = await Promise.all(['../lib/liquid-glass.ts', '../app/(tabs)/_layout.tsx'].map(async path =>
  ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText,
));
const Tabs = Object.assign(({ children }) => React.createElement('ClassicTabs', null, children), { Screen: 'ClassicScreen' });
const NativeTabs = Object.assign(({ children, ...props }) => React.createElement('NativeTabs', props, children), { Trigger: Object.assign(({ children, ...props }) => React.createElement('NativeTrigger', props, children), { Icon: 'Icon', Label: 'Label' }) });
function load(compiled, mocks) {
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => mocks[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}

for (const [OS, Version, isPad, native] of [
  ['ios', '26.0', false, true], ['ios', '27.0', false, true],
  ['ios', '18.7', false, false], ['ios', '26.0', true, false],
  ['android', 36, false, false], ['web', undefined, false, false],
]) {
  test(`${OS} ${Version} ${isPad ? 'iPad' : 'phone'} selects the correct bar with all five routes`, async () => {
    const rn = { Platform: { OS, Version, isPad, isTV: false }, View: 'View', useWindowDimensions: () => ({ fontScale: 1 }) };
    const glass = load(sources[0], { 'react-native': rn });
    assert.equal(glass.LIQUID_GLASS, native);
    const { default: Layout } = load(sources[1], {
      'react-native': rn,
      'expo-router': { Tabs, useSegments: () => ['(tabs)'] },
      'expo-router/native-tabs': { NativeTabs },
      '@expo/vector-icons': { Ionicons: 'Ionicons' },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34 }) },
      '@/hooks/useTheme': { useTheme: () => ({ colors: { accent: '#99472F' } }) },
      '@/hooks/useTranslation': { useTranslation: () => ({ t: key => key }) },
      '@/lib/liquid-glass': glass,
      '@/components/TchopAI': 'TchopAIButton',
      '@/hooks/useTabLayout': { useTabLayout: () => ({ tabBarHeight: 104, fabBottom: 120, fabRight: 16 }) },
    });
    let renderer;
    await act(async () => { renderer = create(React.createElement(Layout)); });
    const screens = renderer.root.findAllByType(native ? 'NativeTrigger' : 'ClassicScreen');
    assert.deepEqual(screens.map(screen => screen.props.name), ['index', 'search', 'planner', 'cookbook', 'settings']);
    assert.equal(renderer.root.findAllByType(native ? 'ClassicTabs' : 'NativeTabs').length, 0);
    if (native) {
      assert.equal(renderer.root.findByType('NativeTabs').props.tintColor, '#99472F');
      assert.deepEqual(renderer.root.findAllByType('Label').map(label => label.props.children), ['tabHome', 'tabSearch', 'tabPlanner', 'tabCookbook', 'tabSettings']);
    }
    await act(async () => renderer.unmount());
  });
}
