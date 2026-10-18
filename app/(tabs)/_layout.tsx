import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { LIQUID_GLASS } from '@/lib/liquid-glass';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const { fontScale } = useWindowDimensions();
  const tabBarHeight = 70 + bottom + Math.max(0, fontScale - 1) * 24;

  // UIKit fournit le Liquid Glass et ses adaptations d'accessibilité sur iPhone iOS 26+.
  // Les routes et leur ordre restent identiques à ceux de la barre classique.
  if (LIQUID_GLASS) {
    return (
      <NativeTabs tintColor={colors.accent} minimizeBehavior="never">
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'house', selected: 'house.fill' }} />
          <Label>{t('tabHome')}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <Icon sf="magnifyingglass" />
          <Label>{t('tabSearch')}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="planner">
          <Icon sf="calendar" />
          <Label>{t('tabPlanner')}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="cookbook">
          <Icon sf={{ default: 'book', selected: 'book.fill' }} />
          <Label>{t('tabCookbook')}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
          <Label>{t('tabSettings')}</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          position: 'absolute',
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: 8 + bottom,
          shadowColor: '#2F2F2E',
          shadowOffset: { width: 0, height: -12 },
          shadowOpacity: 0,
          shadowRadius: 32,
          elevation: 0,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabSearch'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'search' : 'search-outline'} size={21} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: t('tabPlanner'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={21} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: t('tabCookbook'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'book' : 'book-outline'} size={21} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'settings' : 'settings-outline'} size={21} color={color} /></View>
          ),
        }}
      />
    </Tabs>
  );
}
