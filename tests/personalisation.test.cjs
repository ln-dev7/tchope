const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const React = require('react'); const {act, create} = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.join(__dirname, '..');
const isTravora = JSON.parse(fs.readFileSync(path.join(root, 'app.json'))).expo.slug === 'travora';
function loader(mocks = {}) {
 const cache = new Map();
 function load(name) {
  if (Object.hasOwn(mocks, name)) return mocks[name];
  if (!name.startsWith('@/')) return require(name);
  const file = path.join(root, name.slice(2));
  const resolved = [file+'.ts',file+'.tsx',file].find(f=>fs.existsSync(f));
  if(cache.has(resolved))return cache.get(resolved).exports;
  const mod={exports:{}};cache.set(resolved,mod);
  const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id=>id.endsWith('.png')?id:load(id),mod,mod.exports);return mod.exports;
 }
 return load;
}
const load=loader();const {resolveColors,DEFAULT_PALETTE,PALETTE_IDS,isPaletteId}=load('@/constants/themes');
const {APP_ICONS}=load('@/constants/app-icons');
test('default palette retains every original colour in both display modes',()=>{
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/default-colors.json')));
 for(const mode of ['light','dark'])for(const [key,value] of Object.entries(before[mode]))assert.equal(resolveColors(DEFAULT_PALETTE,mode==='dark')[key],value,`${mode}.${key}`);
 for(const invalid of ['__proto__','constructor',{},null]){assert.equal(isPaletteId(invalid),false);assert.equal(resolveColors(invalid,false),resolveColors(DEFAULT_PALETTE,false));}
});
test('all icons are declared in the native build; all palettes have both modes',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.json'))).expo;
 assert.ok(cfg.plugins.indexOf('./plugins/with-personalisation') < cfg.plugins.findIndex(p=>Array.isArray(p)&&p[0]==='expo-alternate-app-icons'));
 const declared=cfg.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-alternate-app-icons')[1];
 assert.deepEqual(declared.map(i=>i.name),APP_ICONS.slice(1).map(i=>i.nativeName));
 for(const i of declared)for(const file of [i.ios,i.android.foregroundImage,i.android.backgroundImage,i.android.monochromeImage])assert.ok(fs.existsSync(path.join(root,file)),file);
 for(const id of PALETTE_IDS)for(const dark of [false,true])assert.deepEqual(Object.keys(resolveColors(id,dark)),Object.keys(resolveColors(DEFAULT_PALETTE,dark)));
});
async function mount(saved, {subscribed=true, failIcon=false, available=true, storageFails=false}={}) {
 let stored=JSON.stringify(saved), listener, pro=subscribed, paywalls=0, alerts=[], actual=null, nativeCalls=0, api;
 const native={supportsAlternateIcons:available,getAppIconName:()=>actual,setAlternateAppIcon:async name=>{nativeCalls++;if(failIcon)throw Error('launcher');actual=name;return name;}};
 const modules=loader({
  'react-native':{Platform:{OS:'ios'},Appearance:{setColorScheme:()=>{}},Alert:{alert:(...a)=>alerts.push(a)},AppState:{addEventListener:(_,fn)=>{listener=fn;return{remove:()=>{}}}}},
  'expo':{requireOptionalNativeModule:()=>available?native:null},
  '@react-native-async-storage/async-storage':{getItem:async()=>stored,setItem:async(_,v)=>{if(storageFails)throw Error('disk');stored=v;}},
  '@/constants/departures':{DEFAULT_DEPARTURE:'cm'},
  '@/context/ProContext':{usePro:()=>({pro,ready:true,openPaywall:()=>{paywalls++;}})},
 });
 const context=modules('@/context/SettingsContext');const {usePersonalisation}=modules('@/hooks/usePersonalisation');
 function Consumer(){api={...context.useSettings(),...usePersonalisation()};return null;}
 let r;await act(async()=>{r=create(React.createElement(context.SettingsProvider,null,React.createElement(Consumer)));});
 return {get api(){return api;},get saved(){return JSON.parse(stored);},get alerts(){return alerts;},get paywalls(){return paywalls;},get nativeCalls(){return nativeCalls;},get actual(){return actual;},expire:async()=>{pro=false;await act(async()=>r.update(React.createElement(context.SettingsProvider,null,React.createElement(Consumer))));},unmount:()=>act(async()=>r.unmount()),foreground:()=>act(async()=>listener?.('active'))};
}
test('old settings migrate; icon, palette, language and display mode persist independently',async()=>{
 const m=await mount({language:'en',theme:'dark',onboarded:true,notifications:{enabled:false}});
 assert.equal(m.api.settings.palette,DEFAULT_PALETTE);assert.equal(m.api.settings.appIcon,'default');
 await act(async()=>m.api.choosePalette(PALETTE_IDS[1]));
 assert.equal(m.nativeCalls,0);
 await act(async()=>m.api.chooseIcon(APP_ICONS[1].id));
 assert.equal(m.saved.palette,PALETTE_IDS[1]);assert.equal(m.saved.appIcon,APP_ICONS[1].id);assert.equal(m.saved.theme,'dark');assert.equal(m.saved.language,'en');
 await act(async()=>{(m.api.setTheme||m.api.updateTheme)('system');await m.api.setPalette(PALETTE_IDS[2]);});
 assert.equal(m.saved.theme,'system');assert.equal(m.saved.appIcon,APP_ICONS[1].id);
 await m.foreground();assert.equal(m.nativeCalls,1);
 await m.unmount();
});
test('expiry keeps the applied choices, locks new ones and leaves default reset free',async()=>{
 const m=await mount({theme:'light',language:'fr'});
 await act(async()=>{await m.api.choosePalette(PALETTE_IDS[1]);await m.api.chooseIcon(APP_ICONS[1].id);});
 await m.expire();assert.equal(m.api.settings.palette,PALETTE_IDS[1]);assert.equal(m.api.settings.appIcon,APP_ICONS[1].id);
 await act(async()=>{await m.api.choosePalette(PALETTE_IDS[2]);await m.api.chooseIcon(APP_ICONS[2].id);});
 assert.equal(m.paywalls,2);assert.equal(m.nativeCalls,1);
 await act(async()=>{await m.api.choosePalette(DEFAULT_PALETTE);await m.api.chooseIcon('default');});
 assert.equal(m.actual,null);assert.equal(m.saved.appIcon,'default');assert.equal(m.saved.palette,DEFAULT_PALETTE);await m.unmount();
});
test('unsupported and failed native changes never persist a fictional icon',async()=>{
 for(const opts of [{available:false},{failIcon:true}]){
  const m=await mount({theme:'light',language:'fr'},opts);await act(async()=>m.api.chooseIcon(APP_ICONS[1].id));
  assert.equal(m.api.settings.appIcon,'default');assert.equal(m.alerts.length,1);assert.equal(m.api.busy,false);await m.unmount();
 }
});
test('native icon changes are serialized and persistence failures are reported',async()=>{
 const m=await mount({theme:'light',language:'fr'},{storageFails:true});
 await act(async()=>Promise.all([m.api.chooseIcon(APP_ICONS[1].id),m.api.chooseIcon(APP_ICONS[2].id)]));
 assert.equal(m.nativeCalls,1);assert.equal(m.alerts.length,1);assert.equal(m.api.busy,false);await m.unmount();
});

test('native plugin preserves deep links, a single default launcher and app-only iOS icon settings', () => {
 const launcher = { action: [{$:{'android:name':'android.intent.action.MAIN'}}], category: [{$:{'android:name':'android.intent.category.LAUNCHER'}}] };
 const deep = { action: [{$:{'android:name':'android.intent.action.VIEW'}}], category: [{$:{'android:name':'android.intent.category.BROWSABLE'}}] };
 const main = {$:{'android:name':'.MainActivity'},'intent-filter':[launcher,deep]};
 const app = {activity:[main], 'activity-alias':[{$:{'android:name':'.MainActivityOcean','android:targetActivity':'.MainActivity','android:enabled':'false','android:icon':'@mipmap/ocean'},'intent-filter':[launcher,deep]}]};
 const objects = {PBXProject:{project:{buildConfigurationList:'global'}},PBXNativeTarget:{app:{productType:'com.apple.product-type.application',buildConfigurationList:'app'},widget:{productType:'com.apple.product-type.app-extension',buildConfigurationList:'widget'}},XCConfigurationList:{},XCBuildConfiguration:{}};
 for (const key of ['global','app','widget']) {
  objects.XCConfigurationList[key]={buildConfigurations:[{value:key}]};
  objects.XCBuildConfiguration[key]={buildSettings:{ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES:['Ocean'],OTHER_SETTING:'preserved'}};
 }
 const plugins = {AndroidConfig:{Manifest:{getMainApplicationOrThrow:()=>app,getMainActivityOrThrow:()=>main}},withAndroidManifest:(c,fn)=>{fn({modResults:{}});return c;},withXcodeProject:(c,fn)=>{fn({modResults:{hash:{project:{objects}}}});return c;}};
 const mod={exports:{}};
 new Function('require','module','exports',fs.readFileSync(path.join(root,'plugins/with-personalisation.js'),'utf8'))(name=>{assert.equal(name,'expo/config-plugins');return plugins;},mod,mod.exports);
 mod.exports({});mod.exports({});
 assert.equal(main.$['android:enabled'],'true');assert.deepEqual(main['intent-filter'],[deep]);
 assert.equal(app['activity-alias'].filter(a=>a.$['android:enabled']==='true').length,1);
 assert.equal(app['activity-alias'].filter(a=>a.$['android:name']==='.MainActivityDefault').length,1);
 assert.deepEqual(app['activity-alias'][0]['intent-filter'],[launcher]);
 for(const key of ['global','widget'])assert.equal(objects.XCBuildConfiguration[key].buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES,undefined);
 assert.deepEqual(objects.XCBuildConfiguration.app.buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES,['Ocean']);
 for(const key of ['global','app','widget'])assert.equal(objects.XCBuildConfiguration[key].buildSettings.OTHER_SETTING,'preserved');
});
