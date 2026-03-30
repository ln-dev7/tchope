'use no memo';
import React from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { RecipeOfTheDayWidget, RecipeOfTheDayWidgetSmall } from './RecipeOfTheDayWidget';
import { PlannerWidgetLarge, PlannerWidgetSmall } from './PlannerWidgets';
import { recipes } from '../data/recipes';

const PLAN_KEY = 'tchope_meal_plan';
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Build a recipe name map from app data
const RECIPE_NAME_MAP: Record<string, string> = {};
recipes.forEach((r) => { RECIPE_NAME_MAP[r.id] = r.name; });

function getRecipeName(id: string): string {
  return RECIPE_NAME_MAP[id] || id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type StoredPlan = {
  endDate: string;
  days: Record<string, { meals: { label: string; recipeId: string }[] }>;
};

async function getPlanData() {
  try {
    const json = await AsyncStorage.getItem(PLAN_KEY);
    if (!json) return null;

    const plan = JSON.parse(json) as StoredPlan;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check expiration
    const end = new Date(plan.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return null;

    const dayPlan = plan.days[todayStr];
    if (!dayPlan) return null;

    const dayLabel = DAY_NAMES[now.getDay()];
    const dateLabel = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const endD = new Date(plan.endDate);
    const endDate = `${endD.getDate()}/${endD.getMonth() + 1}`;

    const meals = dayPlan.meals.map((m) => ({
      label: m.label,
      recipeName: getRecipeName(m.recipeId),
    }));

    return { dayLabel, dateLabel, meals, endDate };
  } catch {
    return null;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetName = props.widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetName === 'RecipeOfTheDaySmall') {
        props.renderWidget(<RecipeOfTheDayWidgetSmall />);
      } else if (widgetName === 'RecipeOfTheDay') {
        props.renderWidget(<RecipeOfTheDayWidget />);
      } else if (widgetName === 'PlannerWidget' || widgetName === 'PlannerWidgetSmall') {
        const plan = await getPlanData();
        if (widgetName === 'PlannerWidgetSmall') {
          props.renderWidget(<PlannerWidgetSmall hasPlan={!!plan} plan={plan ?? undefined} />);
        } else {
          props.renderWidget(<PlannerWidgetLarge hasPlan={!!plan} plan={plan ?? undefined} />);
        }
      }
      break;
    }

    case 'WIDGET_CLICK':
      if (props.clickAction === 'OPEN_RECIPE') {
        const recipeId = props.clickActionData?.recipeId;
        if (recipeId) Linking.openURL(`tchope://recipe/${recipeId}`);
      } else if (props.clickAction === 'OPEN_PLANNER') {
        Linking.openURL('tchope://(tabs)/planner');
      }
      break;

    default:
      break;
  }
}
