import { fixedColors } from "@/constants/themes";
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { LIQUID_GLASS } from '@/lib/liquid-glass';
import { useTabLayout } from '@/hooks/useTabLayout';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const { tabBarHeight } = useTabLayout();

  // UIKit fournit le Liquid Glass et ses adaptations d'accessibilité sur iPhone iOS 26+.
  // Les routes et leur ordre restent identiques à ceux de la barre classique.
  if (LIQUID_GLASS) {
    return (
      <View style={{ flex: 1 }}>
        <NativeTabs tintColor={colors.accent} minimizeBehavior="never" sidebarAdaptable={false}>
          <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
            <NativeTabs.Trigger.Label>{t('tabHome')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="search" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Icon sf="magnifyingglass" />
            <NativeTabs.Trigger.Label>{t('tabSearch')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="planner" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Icon sf="calendar" />
            <NativeTabs.Trigger.Label>{t('tabPlanner')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="cookbook" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
            <NativeTabs.Trigger.Label>{t('tabCookbook')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="settings" disableAutomaticContentInsets>
            <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
            <NativeTabs.Trigger.Label>{t('tabSettings')}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
            shadowColor: fixedColors.softShadow,
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
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'home' : 'home-outline'} size={21} color={focused ? colors.accent : colors.textMuted} /></View>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t('tabSearch'),
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'search' : 'search-outline'} size={21} color={focused ? colors.accent : colors.textMuted} /></View>
            ),
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: t('tabPlanner'),
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={21} color={focused ? colors.accent : colors.textMuted} /></View>
            ),
          }}
        />
        <Tabs.Screen
          name="cookbook"
          options={{
            title: t('tabCookbook'),
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'book' : 'book-outline'} size={21} color={focused ? colors.accent : colors.textMuted} /></View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabSettings'),
            tabBarIcon: ({ focused }) => (
              <View style={{ width: 48, height: 30, borderRadius: 11, backgroundColor: focused ? colors.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={focused ? 'settings' : 'settings-outline'} size={21} color={focused ? colors.accent : colors.textMuted} /></View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
