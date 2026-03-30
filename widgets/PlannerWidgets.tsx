'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// ── Promo: "Create your plan" (app theme) ────────────────────────

export function PlannerPromoWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 20,
        backgroundGradient: {
          from: '#914700',
          to: '#4A2000',
          orientation: 'TL_BR',
        },
      }}
      clickAction="OPEN_PLANNER"
    >
      {/* Top */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: 'match_parent' }}>
        <FlexWidget style={{ backgroundColor: 'rgba(255, 255, 255, 30)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
          <TextWidget text="Tchopé" style={{ fontSize: 12, fontWeight: '800', color: '#FFD4A8' }} />
        </FlexWidget>
        <TextWidget text="📅" style={{ fontSize: 32 }} />
      </FlexWidget>

      {/* Bottom */}
      <FlexWidget style={{ flexDirection: 'column', flexGap: 4 }}>
        <TextWidget text="Planifiez votre semaine" style={{ fontSize: 19, fontWeight: '900', color: '#FFFFFF' }} maxLines={2} />
        <TextWidget text="L'IA compose vos repas sur 7 jours" style={{ fontSize: 11, fontWeight: '500', color: '#FFD4A8' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

export function PlannerPromoWidgetSmall() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGap: 14,
        backgroundGradient: {
          from: '#914700',
          to: '#5C2D00',
          orientation: 'LEFT_RIGHT',
        },
      }}
      clickAction="OPEN_PLANNER"
    >
      <FlexWidget style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 20)', alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text="📅" style={{ fontSize: 24 }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
        <TextWidget text="TCHOPÉ" style={{ fontSize: 8, fontWeight: '800', color: '#FFD4A8', letterSpacing: 1 }} />
        <TextWidget text="Planifiez vos repas" style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }} maxLines={1} />
        <TextWidget text="7 jours, générés par l'IA" style={{ fontSize: 10, fontWeight: '500', color: '#FFD4A8' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

// ── Current Plan ─────────────────────────────────────────────────

type PlanMeal = { label: string; recipeName: string };

interface CurrentPlanProps {
  dayLabel: string;
  dateLabel: string;
  meals: PlanMeal[];
  endDate: string;
}

export function PlannerCurrentWidget({ dayLabel, dateLabel, meals, endDate }: CurrentPlanProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        flexDirection: 'column',
        padding: 20,
        backgroundColor: '#FFFFFF',
      }}
      clickAction="OPEN_PLANNER"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'column', flexGap: 1 }}>
          <TextWidget text={dayLabel} style={{ fontSize: 20, fontWeight: '900', color: '#2F2F2E' }} />
          <TextWidget text={dateLabel} style={{ fontSize: 11, fontWeight: '600', color: '#914700' }} />
        </FlexWidget>
        <FlexWidget style={{ backgroundColor: '#914700', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 }}>
          <TextWidget text="Mon Plan" style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>

      {/* Spacer */}
      <FlexWidget style={{ flex: 1 }} />

      {/* Meals */}
      <FlexWidget style={{ flexDirection: 'column', flexGap: 8 }}>
        {meals.map((meal, i) => (
          <FlexWidget key={i} style={{ flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
            <FlexWidget style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#914700', alignItems: 'center', justifyContent: 'center' }}>
              <TextWidget text={i === 0 ? '🌤' : i === 1 ? '☀️' : '🌙'} style={{ fontSize: 14 }} />
            </FlexWidget>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <TextWidget text={meal.label} style={{ fontSize: 9, fontWeight: '700', color: '#914700' }} />
              <TextWidget text={meal.recipeName} style={{ fontSize: 13, fontWeight: '700', color: '#2F2F2E' }} maxLines={1} />
            </FlexWidget>
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Footer */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4, marginTop: 8 }}>
        <TextWidget text={`Valide jusqu'au ${endDate}`} style={{ fontSize: 10, fontWeight: '500', color: '#5C5B5B' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

export function PlannerCurrentWidgetSmall({ dayLabel, meals, endDate }: CurrentPlanProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexGap: 14,
        backgroundColor: '#FFFFFF',
      }}
      clickAction="OPEN_PLANNER"
    >
      {/* Icon */}
      <FlexWidget style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#914700', alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text="🍽" style={{ fontSize: 22 }} />
      </FlexWidget>

      {/* Content */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
        <TextWidget text={dayLabel} style={{ fontSize: 8, fontWeight: '800', color: '#914700', letterSpacing: 1 }} />
        <TextWidget
          text={meals.length > 0 ? meals[0].recipeName : '—'}
          style={{ fontSize: 14, fontWeight: '800', color: '#2F2F2E' }}
          maxLines={1}
        />
        <TextWidget
          text={meals.length > 1 ? `+ ${meals.length - 1} autre${meals.length > 2 ? 's' : ''} repas · ${endDate}` : `Jusqu'au ${endDate}`}
          style={{ fontSize: 10, fontWeight: '500', color: '#5C5B5B' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ── Smart Widget: switches between promo and current plan ────────

export function PlannerWidgetLarge(props: { hasPlan: boolean; plan?: CurrentPlanProps }) {
  if (props.hasPlan && props.plan) {
    return <PlannerCurrentWidget {...props.plan} />;
  }
  return <PlannerPromoWidget />;
}

export function PlannerWidgetSmall(props: { hasPlan: boolean; plan?: CurrentPlanProps }) {
  if (props.hasPlan && props.plan) {
    return <PlannerCurrentWidgetSmall {...props.plan} />;
  }
  return <PlannerPromoWidgetSmall />;
}
