import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Linking, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useLiveCooking } from '@/hooks/useLiveCooking';
import { isSpeechRecognitionAvailable } from '@/hooks/useSpeechRecognition';
import type { Recipe } from '@/types';

import VoiceOrb from './VoiceOrb';
import LiveCookingHeader from './LiveCookingHeader';
import LiveSubtitles from './LiveSubtitles';
import LiveCookingControls from './LiveCookingControls';

type Props = {
  recipe: Recipe;
  initialStep?: number;
  onClose: () => void;
};

export default function LiveCookingScreen({
  recipe,
  initialStep = 0,
  onClose,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [permissionState, setPermissionState] = useState<
    'checking' | 'granted' | 'denied_can_ask' | 'denied_permanently'
  >('checking');

  const {
    liveState,
    subtitle,
    userTranscript,
    volume,
    isConnected,
    startListening,
    stopListening,
    takePhoto,
    endSession,
    requestPermissions,
    checkPermissions,
  } = useLiveCooking(recipe, initialStep, settings.language);

  const isFr = settings.language === 'fr';
  const { bottom } = useSafeAreaInsets();
  const [showSourceModal, setShowSourceModal] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    (async () => {
      const granted = await checkPermissions();
      if (granted) {
        setPermissionState('granted');
      } else {
        // Don't auto-request, let user tap a button
        setPermissionState('denied_can_ask');
      }
    })();
  }, []);

  const handleRequestPermissions = useCallback(async () => {
    const result = await requestPermissions();
    if (result.granted) {
      setPermissionState('granted');
    } else if (!result.canAskAgain) {
      setPermissionState('denied_permanently');
    }
    // If canAskAgain but not granted, stay on denied_can_ask
  }, [requestPermissions]);

  const handleMicPress = useCallback(() => {
    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startListening();
  }, [isConnected, startListening]);

  const handleMicRelease = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handlePhoto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSourceModal(true);
  }, []);

  const handlePhotoSource = useCallback((source: 'camera' | 'gallery') => {
    setShowSourceModal(false);
    takePhoto(source);
  }, [takePhoto]);

  const handleEnd = useCallback(() => {
    endSession();
    onClose();
  }, [endSession, onClose]);

  // Status text
  const statusText =
    liveState === 'listening'
      ? t('listening')
      : liveState === 'thinking'
        ? t('thinking')
        : liveState === 'speaking'
          ? t('speaking')
          : '';

  // Native module not available (e.g. running in Expo Go)
  if (!isSpeechRecognitionAvailable()) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.centered}>
            <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.gateTitle, { color: colors.text }]}>
              {isFr ? 'TchopAI Live non disponible' : 'TchopAI Live not available'}
            </Text>
            <Text style={[styles.gateDesc, { color: colors.textSecondary }]}>
              {isFr
                ? 'La reconnaissance vocale nécessite un development build. Lancez "npx expo prebuild" puis compilez l\'app.'
                : 'Speech recognition requires a development build. Run "npx expo prebuild" then build the app.'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Permissions not yet granted
  if (permissionState !== 'granted') {
    const isPermanentlyDenied = permissionState === 'denied_permanently';
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.centered}>
          <Ionicons
            name="mic-outline"
            size={56}
            color={colors.accent}
            style={{ marginBottom: 20 }}
          />
          <Text style={[styles.gateTitle, { color: colors.text }]}>
            {isFr ? 'Autoriser le micro' : 'Allow microphone'}
          </Text>
          <Text style={[styles.gateDesc, { color: colors.textSecondary }]}>
            {isFr
              ? 'TchopAI Live a besoin du micro et de la reconnaissance vocale pour vous guider en cuisine.'
              : 'TchopAI Live needs microphone and speech recognition to guide you while cooking.'}
          </Text>

          {isPermanentlyDenied ? (
            <>
              <Text style={[styles.gateHint, { color: colors.textMuted }]}>
                {isFr
                  ? 'Vous avez refusé les permissions. Activez-les dans les réglages.'
                  : 'You denied permissions. Enable them in Settings.'}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={[styles.gateButton, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                <Text style={styles.gateButtonText}>
                  {isFr ? 'Ouvrir les réglages' : 'Open Settings'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleRequestPermissions}
              disabled={permissionState === 'checking'}
              style={[styles.gateButton, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="mic" size={18} color="#FFFFFF" />
              <Text style={styles.gateButtonText}>
                {isFr ? 'Autoriser' : 'Authorize'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <LiveCookingHeader
          recipeName={recipe.name}
          onBack={handleEnd}
          isDark={isDark}
          colors={colors}
        />

        {/* Offline banner */}
        {!isConnected && (
          <View
            style={[
              styles.offlineBanner,
              { backgroundColor: isDark ? 'rgba(231,76,60,0.15)' : 'rgba(231,76,60,0.08)' },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={14} color={isDark ? '#E74C3C' : '#C0392B'} />
            <Text style={[styles.offlineText, { color: isDark ? '#E74C3C' : '#C0392B' }]}>
              {t('liveCookingOffline')}
            </Text>
          </View>
        )}

        {/* Voice Orb */}
        <View style={styles.orbContainer}>
          <VoiceOrb state={liveState} volume={volume} isDark={isDark} colors={colors} />
          {statusText ? (
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {statusText}
            </Text>
          ) : null}
        </View>

        {/* Subtitles */}
        <View style={styles.subtitleContainer}>
          <LiveSubtitles
            subtitle={subtitle}
            userTranscript={userTranscript}
            state={liveState}
            isDark={isDark}
            colors={colors}
          />
        </View>

        {/* Controls */}
        <SafeAreaView edges={['bottom']} style={styles.controlsWrapper}>
          <LiveCookingControls
            state={liveState}
            isDark={isDark}
            onMicPress={handleMicPress}
            onMicRelease={handleMicRelease}
            onPhoto={handlePhoto}
            onEnd={handleEnd}
            colors={colors}
            holdLabel={t('holdToSpeak')}
            endLabel={t('endSession')}
            photoLabel={t('takePhotoForAI')}
          />
        </SafeAreaView>
      </SafeAreaView>

      {/* Photo source picker modal */}
      <Modal visible={showSourceModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: bottom + 16 }}>
          <View style={{
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <TouchableOpacity
              onPress={() => handlePhotoSource('camera')}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}>
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {isFr ? 'Prendre une photo' : 'Take a photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePhotoSource('gallery')}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
              }}>
              <Ionicons name="images-outline" size={20} color={colors.accent} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>
                {isFr ? 'Choisir dans la galerie' : 'Choose from gallery'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => setShowSourceModal(false)}
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderRadius: 20,
              paddingVertical: 16,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textMuted }}>
              {isFr ? 'Annuler' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  gateDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 40,
    lineHeight: 20,
    marginBottom: 24,
  },
  gateHint: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 40,
    lineHeight: 18,
    marginBottom: 16,
  },
  gateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  offlineBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subtitleContainer: {
    minHeight: 80,
    justifyContent: 'center',
    marginBottom: 8,
  },
  controlsWrapper: {
    paddingBottom: 16,
  },
});
