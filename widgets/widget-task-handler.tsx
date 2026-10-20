"use no memo";
import React from 'react';
import { requestWidgetUpdate, type WidgetInfo, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { buildSnapshot } from './snapshot';
import { pageFor, type WidgetSnapshot } from './model';
import { WidgetView } from './WidgetView';
export const WIDGET_KINDS: Record<string,string> = {"RecipeOfTheDay": "discover", "RecipeOfTheDaySmall": "discover", "PlannerWidget": "agenda", "PlannerWidgetSmall": "agenda", "RecipeFavorites": "favorites", "ShoppingWidget": "shopping", "KitchenShortcuts": "shortcuts"};
function render(snapshot: WidgetSnapshot, info: WidgetInfo) {
 const props = {snapshot,page:pageFor(snapshot,WIDGET_KINDS[info.widgetName]||'discover'),width:info.width,height:info.height};
 return {light:<WidgetView {...props} dark={snapshot.mode==='dark'} />,dark:<WidgetView {...props} dark={snapshot.mode!=='light'} />};
}
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
 if (!['WIDGET_ADDED','WIDGET_UPDATE','WIDGET_RESIZED'].includes(props.widgetAction)) return;
 const snapshot=await buildSnapshot(); await props.renderWidget(render(snapshot,props.widgetInfo));
}
export async function refreshAndroidWidgets(snapshot: WidgetSnapshot) {
 await Promise.all(Object.keys(WIDGET_KINDS).map(widgetName=>requestWidgetUpdate({widgetName,renderWidget:info=>render(snapshot,info)})));
}
