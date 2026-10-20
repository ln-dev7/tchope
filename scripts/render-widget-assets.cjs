const fs=require('fs'),path=require('path'),sharp=require('sharp');
(async()=>{
const root=path.resolve(__dirname,'..'); const base=path.dirname(root);
if (path.basename(root)==='tchope') {
const recipeDir=path.join(base,'tchope/assets/images/recipes'),target=path.join(base,'tchope/targets/recipe-widget/assets');fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(recipeDir).filter(f=>f.endsWith('.webp'))){await sharp(path.join(recipeDir,name)).resize(480,320,{fit:'cover'}).jpeg({quality:76}).toFile(path.join(target,name.replace('.webp','.jpg')));}
}
for(const app of [path.basename(root)]){
 const travel=app==='travora-app',dir=path.join(base,app,'assets/widgets');fs.mkdirSync(dir,{recursive:true});
 for(const kind of ['discover','favorites','agenda','shortcuts',...(!travel?['shopping']:[])]){
 const brand=travel?'Travora':'Tchopé',accent=travel?'#D72D51':'#A84027',soft=travel?'#FFE1E8':'#F7E7DE';
 const title={discover:travel?'Ailleurs, aujourd’hui':'Au menu aujourd’hui',favorites:travel?'Vos envies d’ailleurs':'Votre carnet gourmand',agenda:travel?'Prochain départ':'À table aujourd’hui',shortcuts:travel?'Prêt à partir ?':'On cuisine quoi ?',shopping:'Au marché'}[kind];
 const sub={discover:travel?'Votre prochaine destination':'Une recette à découvrir',favorites:'Vos favoris, à portée de main',agenda:travel?'Vos voyages se préparent':'Votre planning de repas',shortcuts:travel?'Explorer · Dossiers · TravorAI':'Recettes · Planning · TchopAI',shopping:'Votre liste de courses'}[kind];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400"><rect width="720" height="400" rx="42" fill="#FAF8F4"/><text x="40" y="58" fill="${accent}" font-family="Arial" font-size="24" font-weight="700">${brand}</text><circle cx="657" cy="50" r="17" fill="${soft}"/><text x="40" y="125" font-family="Arial" font-size="34" font-weight="700" fill="#29241F">${title}</text><text x="40" y="170" font-family="Arial" font-size="23" fill="#625B52">${sub}</text><rect x="40" y="208" width="640" height="138" rx="24" fill="${soft}"/><path d="M84 282h70m-30-30 30 30-30 30" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><text x="193" y="290" font-family="Arial" font-size="25" fill="${accent}">Ouvrir ${brand}</text></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(path.join(dir,kind+'.png'));
 }
}
console.log('Widget thumbnails and picker previews rendered');
})();
