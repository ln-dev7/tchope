"use no memo";
import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, type ImageWidgetSource } from 'react-native-android-widget';
import type { WidgetSnapshot, WidgetPage, WidgetItem } from './model';
import { getRecipeImage } from '../constants/images';
const imageFor = (item: WidgetItem): ImageWidgetSource | null => item.image.startsWith('asset:') ? getRecipeImage(item.id) as ImageWidgetSource | null : null;
const symbol = (s: string) => ({ 'heart.fill': '♡', calendar: '▦', 'basket.fill': '✓', sparkles: '✦', airplane: '✈', 'folder.fill': '▤', magnifyingglass: '⌕', 'fork.knife': '◒' }[s] || '◎');
export function WidgetView({ snapshot, page, width, height, dark }: { snapshot: WidgetSnapshot; page: WidgetPage; width: number; height: number; dark: boolean }) {
 const c = (dark ? snapshot.dark : snapshot.light) as Record<keyof WidgetSnapshot['light'], `#${string}`>;
 const compact = height < 145, narrow = width < 220, pad = narrow || compact ? 14 : 18;
 const inner = Math.max(80, width - pad * 2), bodyHeight = Math.max(30, height - pad * 2 - 26);
 const hero = page.items[0], shortcuts = page.items[0]?.id === 'search';
 const isHero = !shortcuts && (page.symbol === 'fork.knife' || page.symbol === 'globe.europe.africa.fill');
 const photo = isHero && hero ? imageFor(hero) : null;
 const label = (text: string, size: number, color: `#${string}` = c.ink, bold = false, lines = 1) => <TextWidget text={text} maxLines={lines} style={{ fontSize: size, color, fontWeight: bold ? '700' : '400' }} />;
 const entry = (v: WidgetItem) => <FlexWidget key={v.id} clickAction="OPEN_URI" clickActionData={{ uri: v.url }} accessibilityLabel={v.title} style={{ width: inner, height: 54, flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
  <FlexWidget style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>{label(symbol(v.symbol),19,c.accent)}</FlexWidget>
  <FlexWidget style={{ width: Math.max(30,inner-42), flexDirection: 'column', flexGap: 3 }}>{label(v.title,14,c.ink,true)}{label([v.subtitle,v.detail].filter(Boolean).join(' · '),11,c.muted)}</FlexWidget>
 </FlexWidget>;
 return <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: isHero && hero ? hero.url : page.url }} accessibilityLabel={`${snapshot.brand}. ${page.title}`} style={{ width: 'match_parent', height: 'match_parent', borderRadius: 26, overflow: 'hidden', backgroundColor: c.bg, padding: pad, flexDirection: 'column', flexGap: 6 }}>
  <FlexWidget style={{ width: inner, height: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>{label(snapshot.brand,12,c.accent,true)}{label(symbol(page.symbol),18,c.accent)}</FlexWidget>
  {compact ? <FlexWidget style={{ width: inner, height: bodyHeight, justifyContent: 'center', flexDirection: 'column', flexGap: 3 }}>{label(hero?.title || page.title,17,c.ink,true)}{label(hero ? [hero.subtitle,hero.detail].filter(Boolean).join(' · ') : page.empty,11,c.muted)}</FlexWidget> :
  shortcuts ? <FlexWidget style={{width:inner,height:bodyHeight,flexDirection:'column',flexGap:10}}>
    {label(page.title,narrow?15:18,c.ink,true)}
    <FlexWidget style={{width:inner,height:Math.max(45,bodyHeight-34),flexDirection:'row',flexGap:8}}>{page.items.slice(0,3).map(v=><FlexWidget key={v.id} clickAction="OPEN_URI" clickActionData={{uri:v.url}} accessibilityLabel={v.title} style={{width:Math.floor((inner-16)/3),height:Math.max(45,bodyHeight-34),backgroundColor:c.soft,borderRadius:15,padding:narrow?4:8,alignItems:'center',justifyContent:'center',flexDirection:'column',flexGap:7}}>{label(symbol(v.symbol),22,c.accent)}{label(v.title,narrow?9:11,c.accent,true,2)}</FlexWidget>)}</FlexWidget>
  </FlexWidget> : isHero && hero ? <FlexWidget style={{ width:inner,height:bodyHeight,flexDirection:narrow?'column':'row',flexGap:narrow?5:14,alignItems:narrow?'flex-start':'center' }}>
    {photo ? <ImageWidget image={photo} imageWidth={380} imageHeight={280} radius={14} style={{width:narrow?inner:Math.min(160,Math.round(width*.39)),height:narrow?Math.max(30,bodyHeight-67):bodyHeight}}/> : null}
    <FlexWidget style={{width:narrow?inner:inner-(photo?Math.min(160,Math.round(width*.39))+14:0),flexDirection:'column',flexGap:narrow?3:7}}>
      {!narrow?label(page.subtitle,9,c.accent,true):null}
      {label(hero.title,narrow?17:23,c.ink,true,narrow&&height<240?1:2)}
      {label([hero.subtitle,hero.detail].filter(Boolean).join(' · '),narrow?10:12,c.muted,false,narrow?1:2)}
      {height>245?label(snapshot.locale==='en'?'Discover →':'Découvrir →',12,c.accent,true):null}
    </FlexWidget>
  </FlexWidget> : <FlexWidget style={{width:inner,height:bodyHeight,flexDirection:'column',flexGap:8}}>
    {label(page.title,narrow?17:21,c.ink,true,2)}
    {page.items.length?page.items.slice(0,Math.max(1,Math.min(5,Math.floor((bodyHeight-40)/54)))).map(entry):<FlexWidget style={{width:inner,height:Math.max(30,bodyHeight-40),justifyContent:'center',flexDirection:'column',flexGap:8}}>{label(page.empty,14,c.muted,false,3)}{label(snapshot.locale==='en'?'Open the app →':'Ouvrir l’app →',12,c.accent,true)}</FlexWidget>}
  </FlexWidget>}
 </FlexWidget>;
}
