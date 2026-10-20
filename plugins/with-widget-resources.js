const { withAndroidManifest, withStringsXml, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('node:fs/promises'); const path = require('node:path');
module.exports = config => {
 const widgets = require('../app.json').expo.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-android-widget')[1].widgets;
 const names = {DestinationOfTheDay:'Daily discovery',DestinationOfTheDaySmall:'Daily discovery · compact',FavoritesWidget:'Favourites',FavoritesWidgetSmall:'Favourites · compact',TravelAgenda:'Next departure',TravelShortcuts:'Travel shortcuts',RecipeOfTheDay:'Daily recipe',RecipeOfTheDaySmall:'Daily recipe · compact',PlannerWidget:'Meal plan',PlannerWidgetSmall:'Meal plan · compact',RecipeFavorites:'Recipe book',ShoppingWidget:'Shopping list',KitchenShortcuts:'Kitchen shortcuts'};
 config = withAndroidManifest(config, c => {
  const app=AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
  for(const receiver of app.receiver || []) {
   const widget=widgets.find(w => receiver.$['android:name'].endsWith('.widget.'+w.name));
   if(widget)receiver.$['android:label']='@string/widget_'+widget.name.toLowerCase()+'_label';
  }
  return c;
 });
 config = withStringsXml(config,c=>{
  const strings=c.modResults.resources.string || [];
  for(const widget of widgets){
   const key='widget_'+widget.name.toLowerCase();
   const desc=strings.find(x=>x.$.name===key+'_description'); if(desc)delete desc.$.translatable;
   if(!strings.some(x=>x.$.name===key+'_label'))strings.push({$: {name:key+'_label'},_:widget.label});
  }
  c.modResults.resources.string=strings;return c;
 });
 return withDangerousMod(config,['android',async c=>{
  const directory=path.join(c.modRequest.platformProjectRoot,'app/src/main/res/values-en');await fs.mkdir(directory,{recursive:true});
  const rows=widgets.flatMap(w=>{const k='widget_'+w.name.toLowerCase();return [`<string name="${k}_label">${config.name} · ${names[w.name]}</string>`,`<string name="${k}_description">${names[w.name]} — adapts to your screen</string>`];});
  await fs.writeFile(path.join(directory,'ln_widgets.xml'),'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'+rows.join('\n')+'\n</resources>\n');return c;
 }]);
};
