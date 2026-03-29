'use no memo';
import React from 'react';
import { Linking } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { RecipeOfTheDayWidget, RecipeOfTheDayWidgetSmall } from './RecipeOfTheDayWidget';

const WIDGET_NAME_SMALL = 'RecipeOfTheDaySmall';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetName = props.widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetName === WIDGET_NAME_SMALL) {
        props.renderWidget(<RecipeOfTheDayWidgetSmall />);
      } else {
        props.renderWidget(<RecipeOfTheDayWidget />);
      }
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_RECIPE') {
        const recipeId = props.clickActionData?.recipeId;
        if (recipeId) {
          Linking.openURL(`tchope://recipe/${recipeId}`);
        }
      }
      break;

    default:
      break;
  }
}
