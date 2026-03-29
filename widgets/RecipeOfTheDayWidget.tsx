'use no memo';
import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';
import type { ImageWidgetSource } from 'react-native-android-widget';
import { getRecipeOfTheDay } from './data';

/**
 * Large widget (3x2) — Card style: image top, content bottom
 */
export function RecipeOfTheDayWidget() {
  const recipe = getRecipeOfTheDay();

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        overflow: 'hidden',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
      }}
      clickAction="OPEN_RECIPE"
      clickActionData={{ recipeId: recipe.id }}
    >
      {/* Image wrapper — forces full width */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 110,
          backgroundColor: '#E8D5C4',
        }}
      >
        <ImageWidget
          image={recipe.imageUrl as ImageWidgetSource}
          imageWidth={600}
          imageHeight={300}
          radius={0}
          style={{
            width: 'match_parent',
            height: 110,
          }}
        />
      </FlexWidget>

      {/* Content bottom */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          padding: 14,
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundGradient: {
            from: '#FFFFFF',
            to: '#FFF5EB',
            orientation: 'TOP_BOTTOM',
          },
        }}
      >
        {/* Badge */}
        <FlexWidget style={{ flexDirection: 'row' }}>
          <FlexWidget
            style={{
              backgroundColor: '#914700',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={`${recipe.emoji}  Recette du jour`}
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Recipe name */}
        <TextWidget
          text={recipe.name}
          style={{
            fontSize: 19,
            fontWeight: '900',
            color: '#2F2F2E',
          }}
          maxLines={2}
        />

        {/* Details */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            flexGap: 14,
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`📍 ${recipe.region}`}
            style={{ fontSize: 11, fontWeight: '600', color: '#914700' }}
          />
          <TextWidget
            text={`⏱ ${recipe.duration} min`}
            style={{ fontSize: 11, fontWeight: '600', color: '#914700' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * Small widget (3x1) — Image left, content right
 */
export function RecipeOfTheDayWidgetSmall() {
  const recipe = getRecipeOfTheDay();

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 20,
        overflow: 'hidden',
        flexDirection: 'row',
        backgroundColor: '#FFF5EB',
      }}
      clickAction="OPEN_RECIPE"
      clickActionData={{ recipeId: recipe.id }}
    >
      {/* Image wrapper — forces full height */}
      <FlexWidget
        style={{
          width: 95,
          height: 'match_parent',
          backgroundColor: '#E8D5C4',
        }}
      >
        <ImageWidget
          image={recipe.imageUrl as ImageWidgetSource}
          imageWidth={300}
          imageHeight={300}
          radius={0}
          style={{
            width: 95,
            height: 'match_parent',
          }}
        />
      </FlexWidget>

      {/* Content right */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'column',
          justifyContent: 'center',
          flexGap: 4,
        }}
      >
        {/* Badge */}
        <FlexWidget style={{ flexDirection: 'row' }}>
          <FlexWidget
            style={{
              backgroundColor: '#914700',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <TextWidget
              text={`${recipe.emoji} Recette du jour`}
              style={{ fontSize: 8, fontWeight: '700', color: '#FFFFFF' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Name */}
        <TextWidget
          text={recipe.name}
          style={{
            fontSize: 15,
            fontWeight: '900',
            color: '#2F2F2E',
          }}
          maxLines={1}
        />

        {/* Details */}
        <TextWidget
          text={`📍 ${recipe.region}  ·  ⏱ ${recipe.duration} min`}
          style={{ fontSize: 10, fontWeight: '600', color: '#914700' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
