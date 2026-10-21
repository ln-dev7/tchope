const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'..');const travel=JSON.parse(fs.readFileSync(path.join(root,'app.json'))).expo.slug==='travora';
function loadFile(file,mocks={},cache=new Map()){
 file=path.resolve(root,file);if(!path.extname(file))file+='.ts';
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(Object.hasOwn(mocks,name))return mocks[name];
  if(name.startsWith('@/'))return loadFile(name.slice(2),mocks,cache);
  if(name.startsWith('.'))return loadFile(path.relative(root,path.resolve(path.dirname(file),name)),mocks,cache);
  return require(name);
 },mod,mod.exports);return mod.exports;
}
const model=loadFile('widgets/model');
test('calendar uses local dates across midnight, month and year boundaries',()=>{
 const now=new Date(2026,11,31,23,59);const days=model.futureDays(now);
 assert.equal(days.length,8);assert.equal(model.dateKey(days[0]),'2026-12-31');assert.equal(model.dateKey(days[1]),'2027-01-01');
 assert.deepEqual(model.strings([1,null,'ok',{}]),['ok']);
});
function fixture(storage){
 const recipe={id:'ndole',name:'Ndolé',category:'Sauce',duration:120,servings:4,ingredients:[]};
 const country={slug:'barbados',name:'Barbade',mainCity:'Bridgetown',tagline:'Une île des Caraïbes',emoji:'🇧🇧'};
 const mocks={
 '@react-native-async-storage/async-storage':{getItem:async key=>storage[key]===undefined?null:JSON.stringify(storage[key])},
 '../data/recipes':{recipes:[recipe]},'../data/recipes-en':{recipesEn:{ndole:{name:'Ndole',ingredients:[]}}},
 '../constants/images':{hasRecipePhoto:()=>true},
 '../data':{getCountry:()=>country,getCountries:()=>[country],FEATURED_SLUGS:['barbados']},
 '../data/photos.generated':{photos:{}},'../lib/app-data':{loadCache:()=>{}},
 '../lib/dossier/store':{loadDossiers:async()=>storage.dossiers||[]},
 '../lib/dossier/migrate':{visibleDossiers:(rows,enabled)=>rows.filter(d=>enabled||d.kind!=='study')},
 '../lib/features':{isFeatureEnabled:()=>false},
 };return loadFile('widgets/snapshot',mocks);
}
test('empty and expired states stay useful and never leak private documents',async()=>{
 const prefix=travel?'travora':'tchope';const storage={[prefix+'_settings']:{language:'en',theme:'dark',palette:travel?'lagon':'bissap'}};
 storage.dossiers=[{id:'private',slug:'barbados',departure:'cm',kind:'study',tripDate:'2026-10-25',notes:'SECRET',files:['SECRET']}];
 const s=await fixture(storage).buildSnapshot(new Date(2026,9,20,12));
 assert.equal(s.locale,'en');assert.equal(s.mode,'dark');assert.equal(Object.keys(s.days).length,8);
 assert.equal(s.days['2026-10-20'].favorites.items.length,0);assert.equal(s.days['2026-10-20'].agenda.items.length,0);
 assert.ok(!JSON.stringify(s).includes('SECRET'));
 const stale=model.pageFor(s,'agenda',new Date(2026,10,20));assert.equal(stale.items.length,0);assert.match(stale.empty,/refresh/);
});
test('day-specific agenda never carries yesterday’s meal or an expired departure',async()=>{
 const prefix=travel?'travora':'tchope';const storage={[prefix+'_settings']:{language:'en'}};
 if(travel)storage.dossiers=[{id:'trip1',slug:'barbados',departure:'cm',kind:'trip',tripDate:'2026-10-20',notes:'PRIVATE'},{id:'archived',slug:'barbados',departure:'cm',archivedAt:'2026-10-19',tripDate:'2026-10-23'}];
 else storage.tchope_meal_plan={endDate:'2026-10-20',days:{'2026-10-20':{meals:[{label:'Déjeuner',slot:'lunchMeal',recipeId:'ndole'}]}}};
 const s=await fixture(storage).buildSnapshot(new Date(2026,9,20,12));
 assert.equal(s.days['2026-10-20'].agenda.items.length,1);assert.equal(s.days['2026-10-21'].agenda.items.length,0);
 assert.match(s.days['2026-10-20'].agenda.items[0].url,new RegExp('^'+prefix+'://'));
 if(!travel)assert.equal(s.days['2026-10-20'].agenda.items[0].subtitle,'Lunch');
 assert.ok(!JSON.stringify(s).includes('PRIVATE'));
});
test('native extension and app share the same entitlement; all Android providers have previews',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.json'))).expo;
 const target=require(path.join(root,'targets',travel?'travel-widget':'recipe-widget','expo-target.config.js'));
 assert.deepEqual(cfg.ios.entitlements['com.apple.security.application-groups'],target.entitlements['com.apple.security.application-groups']);
 const widgets=cfg.plugins.find(p=>Array.isArray(p)&&p[0]==='react-native-android-widget')[1].widgets;
 for(const w of widgets){assert.ok(fs.existsSync(path.join(root,w.previewImage)));assert.ok(w.updatePeriodMillis>=1800000);}
 const swift=fs.readFileSync(path.join(root,'targets',travel?'travel-widget':'recipe-widget','Sources/Widgets.swift'),'utf8');
 assert.ok(!swift.includes('UserDefaults.standard'));for(const family of ['systemSmall','systemMedium','systemLarge','systemExtraLarge','accessoryCircular','accessoryInline','accessoryRectangular'])assert.ok(swift.includes('.'+family));
});

// These constructors are looked up by name; debug builds do not expose this regression.
test('release rules preserve the Room implementation and reflective InputMerger constructor',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.json'))).expo;
 const rules=cfg.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-build-properties')[1].android.extraProguardRules;
 assert.match(rules,/-keep class androidx\.work\.impl\.WorkDatabase_Impl \{ \*; \}/);
 assert.match(rules,/-keep class \* extends androidx\.work\.InputMerger \{ public <init>\(\); \}/);
});
