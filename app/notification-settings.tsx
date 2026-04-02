import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking, Platform, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useMealPlanner } from '@/context/MealPlannerContext';
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncNotifications,
} from '@/utils/notifications';

function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function NotificationSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateNotifications } = useSettings();
  const { currentPlan } = useMealPlanner();
  const prefs = settings.notifications;
  const isFr = settings.language === 'fr';

  const [hasPermission, setHasPermission] = useState(true);
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const hasMealPlan = !!currentPlan;

  useEffect(() => {
    getNotificationPermission().then(setHasPermission);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setHasPermission(true);
    } else {
      // Permission denied — open system settings
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    }
  }, []);

  const handleToggle = useCallback(
    (key: 'mealReminder' | 'recipeOfTheDay' | 'shoppingListReminder', value: boolean) => {
      updateNotifications({ [key]: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      syncNotifications({ ...prefs, [key]: value }, isFr, { hasMealPlan });
    },
    [updateNotifications, prefs, isFr, hasMealPlan],
  );

  const handleTimeChange = useCallback(
    (key: string, date: Date) => {
      const timeStr = dateToTime(date);
      updateNotifications({ [key]: timeStr });
      syncNotifications({ ...prefs, [key]: timeStr }, isFr, { hasMealPlan });
    },
    [updateNotifications, prefs, isFr, hasMealPlan],
  );

  type NotifItem = {
    key: 'mealReminder' | 'recipeOfTheDay' | 'shoppingListReminder';
    timeKey: 'mealReminderTime' | 'recipeOfTheDayTime' | 'shoppingListReminderTime';
    icon: string;
    iconColor: string;
    title: string;
    desc: string;
    hint?: string;
  };

  const items: NotifItem[] = [
    {
      key: 'mealReminder',
      timeKey: 'mealReminderTime',
      icon: 'restaurant-outline',
      iconColor: colors.accent,
      title: t('notifMealReminder'),
      desc: t('notifMealReminderDesc'),
      hint: !hasMealPlan ? t('notifNoMealPlan') : undefined,
    },
    {
      key: 'recipeOfTheDay',
      timeKey: 'recipeOfTheDayTime',
      icon: 'sparkles-outline',
      iconColor: '#A855F7',
      title: t('notifRecipeOfTheDay'),
      desc: t('notifRecipeOfTheDayDesc'),
    },
    {
      key: 'shoppingListReminder',
      timeKey: 'shoppingListReminderTime',
      icon: 'cart-outline',
      iconColor: colors.green,
      title: t('notifShoppingReminder'),
      desc: t('notifShoppingReminderDesc'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          gap: 16,
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.8 }}>
          {t('notifications')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 + bottom, gap: 16 }}
        showsVerticalScrollIndicator={false}>

        {/* Permission banner */}
        {!hasPermission && (
          <View
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
              borderRadius: 20,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="notifications-off-outline" size={20} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444', flex: 1 }}>
                {t('notifPermissionRequired')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRequestPermission}
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                {t('notifOpenSettings')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notification items */}
        {items.map((item) => {
          const enabled = prefs[item.key];
          const timeValue = prefs[item.timeKey];

          return (
            <View
              key={item.key}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 20,
                gap: 14,
              }}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: isDark ? `${item.iconColor}20` : `${item.iconColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {item.title}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(val) => handleToggle(item.key, val)}
                  disabled={!hasPermission}
                  trackColor={{ false: colors.border, true: item.iconColor }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Description */}
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, paddingLeft: 56 }}>
                {item.desc}
              </Text>

              {/* Hint (e.g. no meal plan) */}
              {item.hint && enabled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 56 }}>
                  <Ionicons name="information-circle-outline" size={14} color="#F59E42" />
                  <Text style={{ fontSize: 12, color: '#F59E42', flex: 1 }}>
                    {item.hint}
                  </Text>
                </View>
              )}

              {/* Time button */}
              {enabled && (
                <View style={{ paddingLeft: 56 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setTempDate(timeToDate(timeValue));
                      setShowPicker(item.timeKey);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      alignSelf: 'flex-start',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {timeValue}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Time picker — Android: native dialog, iOS: bottom sheet modal */}
      {Platform.OS === 'android' && showPicker !== null && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(_e, date) => {
            if (date && showPicker) handleTimeChange(showPicker, date);
            setShowPicker(null);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(null)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
            }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setShowPicker(null)}
            />
            <View
              style={{
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: bottom + 16,
              }}>
              {/* Handle bar */}
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
              </View>

              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                {t('notifTime')}
              </Text>

              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={(_e, date) => {
                    if (date) setTempDate(date);
                  }}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={{ height: 180, width: 200 }}
                />
              </View>

              {/* Confirm button */}
              <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (showPicker) handleTimeChange(showPicker, tempDate);
                    setShowPicker(null);
                  }}
                  style={{
                    backgroundColor: colors.accent,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
