import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { getRecipeVideos, getRecipeVideosEn, hasMultipleLanguages } from '@/constants/videos';
import type { RecipeVideo } from '@/constants/videos';

type Lang = 'fr' | 'en';

export default function RecipeVideosScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const { bottom } = useSafeAreaInsets();
  const recipeId = id ?? '';
  const showTabs = hasMultipleLanguages(recipeId);
  const [lang, setLang] = useState<Lang>('fr');

  const videos = useMemo<RecipeVideo[]>(() => {
    if (lang === 'en') return getRecipeVideosEn(recipeId) ?? [];
    return getRecipeVideos(recipeId) ?? [];
  }, [recipeId, lang]);

  const openVideo = (videoId: string) => {
    WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${videoId}&utm_source=tchope&utm_medium=app&utm_campaign=recipe_video`);
  };

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
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t('videoRecipes')}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 + bottom, gap: 20 }}
        showsVerticalScrollIndicator={false}>

        {/* Language tabs - only shown when both FR and EN exist */}
        {showTabs && (
          <View
            style={{
              backgroundColor: isDark ? '#3A3A3A' : '#E4E2E1',
              borderRadius: 9999,
              padding: 4,
              flexDirection: 'row',
            }}>
            <TouchableOpacity
              onPress={() => setLang('fr')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: lang === 'fr' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
                ...(lang === 'fr'
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }
                  : {}),
              }}>
              <Text style={{ fontSize: 16 }}>🇫🇷</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: lang === 'fr' ? '700' : '500',
                  color: lang === 'fr' ? colors.accent : colors.textSecondary,
                }}>
                Français
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLang('en')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: lang === 'en' ? (isDark ? colors.card : '#FFFFFF') : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}>
              <Text style={{ fontSize: 16 }}>🇬🇧</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: lang === 'en' ? '700' : '500',
                  color: lang === 'en' ? colors.accent : colors.textSecondary,
                }}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info banner */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(249,127,6,0.1)' : 'rgba(249,127,6,0.08)',
            borderRadius: 24,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? 'rgba(249,127,6,0.2)' : 'rgba(249,127,6,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="play-circle" size={24} color={colors.accentLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {t('videoTutorials')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {t('videoSubtitle')}
            </Text>
          </View>
        </View>

        {/* Video cards */}
        {videos.map((video, index) => (
          <TouchableOpacity
            key={`${lang}-${video.id}`}
            onPress={() => openVideo(video.id)}
            activeOpacity={0.85}
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderRadius: 28,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}>
            {/* YouTube Thumbnail */}
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg` }}
                style={{ width: '100%', height: 200 }}
                contentFit="cover"
                transition={200}
              />
              {/* Play overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: 'rgba(255,0,0,0.9)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
              </View>
              {/* Video number + lang badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  flexDirection: 'row',
                  gap: 6,
                }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {index + 1}/{videos.length}
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                  </Text>
                </View>
              </View>
            </View>
            {/* Video info */}
            <View style={{ padding: 20, gap: 8 }}>
              <Text
                style={{ fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22 }}
                numberOfLines={2}>
                {video.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>YouTube</Text>
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>
                    {t('watchVideo')}
                  </Text>
                  <Ionicons name="open-outline" size={12} color={colors.accent} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
