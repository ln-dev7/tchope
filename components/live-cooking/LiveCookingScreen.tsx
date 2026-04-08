import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, TouchableOpacity, Modal, ScrollView, AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettings } from '@/context/SettingsContext';
import { useLiveCooking } from '@/hooks/useLiveCooking';
import { isSpeechRecognitionAvailable } from '@/hooks/useSpeechRecognition';
import type { Recipe } from '@/types';
import { useImageQuota } from '@/hooks/useImageQuota';

import VoiceOrb from './VoiceOrb';
import LiveCookingHeader from './LiveCookingHeader';
import LiveSubtitles from './LiveSubtitles';
import LiveCookingControls from './LiveCookingControls';
import CameraPreview from './CameraPreview';

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
    flushResult,
    takePhoto,
    endSession,
    getHistory,
    requestPermissions,
    checkPermissions,
    setLiveCameraImage,
  } = useLiveCooking(recipe, initialStep, settings.language);

  const isFr = settings.language === 'fr';
  const { bottom } = useSafeAreaInsets();
  const imageQuota = useImageQuota();
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuotaInfo, setShowQuotaInfo] = useState(false);

  // Live Camera mode state
  const [mode, setMode] = useState<'audio' | 'camera'>('audio');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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

  // Use a ref to always have the current mode in async callbacks
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Switch between audio and camera mode
  const handleModeSwitch = useCallback(async () => {
    if (modeRef.current === 'camera') {
      setMode('audio');
      return;
    }
    // Switching to camera — check permission
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          isFr ? 'Permission caméra' : 'Camera permission',
          t('cameraPermissionNeeded'),
        );
        return;
      }
    }
    setMode('camera');
  }, [cameraPermission, requestCameraPermission, isFr, t]);

  // Pause camera when app goes to background
  useEffect(() => {
    if (mode !== 'camera') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setMode('audio');
      }
    });
    return () => sub.remove();
  }, [mode]);

  const handleMicPress = useCallback(() => {
    if (!isConnected) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startListening();
  }, [isConnected, startListening]);

  const handleMicRelease = useCallback(async () => {
    // Stop speech recognition first (buffers the result, doesn't send yet)
    stopListening();

    // In live camera mode, capture the photo before flushing
    if (mode === 'camera' && cameraRef.current) {
      if (imageQuota.canSend) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.5,
            base64: true,
            skipProcessing: true,
            imageType: 'jpg',
          });
          if (photo?.base64) {
            setLiveCameraImage(photo.base64);
            await imageQuota.increment();
          }
        } catch {
          // Photo capture failed — will send voice only
        }
      }
    }

    // Now send the buffered speech result + photo (if any) to the AI
    flushResult();
  }, [mode, stopListening, flushResult, setLiveCameraImage, imageQuota]);

  const handlePhoto = useCallback(() => {
    if (!imageQuota.canSend) {
      Alert.alert(
        isFr ? 'Limite atteinte' : 'Limit reached',
        t('imageQuotaReached'),
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSourceModal(true);
  }, [imageQuota, isFr, t]);

  const handlePhotoSource = useCallback(async (source: 'camera' | 'gallery') => {
    setShowSourceModal(false);
    await imageQuota.increment();
    takePhoto(source);
  }, [takePhoto, imageQuota]);

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
          onHistory={() => setShowHistory(true)}
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

        {/* Quota badge + Mode switch on same line — hidden while speaking/listening */}
        {liveState === 'idle' && (
          <View style={styles.topBadgeRow}>
            {/* Photo quota badge — tap for info */}
            <TouchableOpacity
              onPress={() => setShowQuotaInfo(true)}
              activeOpacity={0.7}
              style={[
                styles.quotaBadge,
                {
                  backgroundColor: isDark ? colors.surface : '#F3F0EF',
                  borderColor: imageQuota.remaining <= 3 ? '#E74C3C' : colors.border,
                },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={13}
                color={imageQuota.remaining <= 3 ? '#E74C3C' : colors.textMuted}
              />
              <Text style={[
                styles.quotaBadgeText,
                { color: imageQuota.remaining <= 3 ? '#E74C3C' : colors.textMuted },
              ]}>
                {imageQuota.remaining}/{imageQuota.limit}
              </Text>
            </TouchableOpacity>

            {/* Mode switch pill */}
            <TouchableOpacity
              onPress={handleModeSwitch}
              style={[
                styles.modeSwitchPill,
                {
                  backgroundColor: isDark
                    ? (mode === 'camera' ? `${colors.accent}25` : colors.surface)
                    : (mode === 'camera' ? `${colors.accent}12` : '#F3F0EF'),
                  borderColor: mode === 'camera' ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name={mode === 'camera' ? 'videocam' : 'videocam-outline'}
                size={16}
                color={mode === 'camera' ? colors.accent : colors.textMuted}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: mode === 'camera' ? colors.accent : colors.textMuted,
                }}
              >
                {mode === 'camera' ? t('liveCameraMode') : t('audioOnlyMode')}
              </Text>
              {mode === 'camera' && (
                <View style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
                  backgroundColor: colors.accent,
                  borderRadius: 6,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#FFFFFF' }}>
                    BETA
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Center area: VoiceOrb or Camera Preview */}
        <View style={styles.orbContainer}>
          {mode === 'audio' ? (
            <>
              <VoiceOrb state={liveState} volume={volume} isDark={isDark} colors={colors} />
              {statusText ? (
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {statusText}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <CameraPreview
                cameraRef={cameraRef}
                facing={cameraFacing}
                onFlip={() => setCameraFacing((f) => (f === 'back' ? 'front' : 'back'))}
                isThinking={liveState === 'thinking'}
                isDark={isDark}
                colors={colors}
              />
              <Text style={[styles.cameraHint, { color: colors.textMuted }]}>
                {t('cameraCaptureHint')}
              </Text>
              {statusText ? (
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {statusText}
                </Text>
              ) : null}
            </>
          )}
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
            mode={mode}
          />
        </SafeAreaView>
      </SafeAreaView>

      {/* History modal */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowHistory(false)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 }}>
                {isFr ? 'Historique' : 'History'}
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {getHistory().length === 0 ? (
                <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
                  {isFr ? 'Aucun message pour le moment' : 'No messages yet'}
                </Text>
              ) : (
                getHistory().map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const text = typeof msg.content === 'string'
                    ? msg.content
                    : msg.content.find((c) => c.type === 'text')?.text ?? (isFr ? '📷 Photo envoyée' : '📷 Photo sent');
                  return (
                    <View
                      key={i}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        backgroundColor: isUser ? colors.accent : (isDark ? '#2A2A2A' : '#F3F0EF'),
                        borderRadius: 18,
                        borderBottomRightRadius: isUser ? 6 : 18,
                        borderBottomLeftRadius: isUser ? 18 : 6,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ fontSize: 14, lineHeight: 20, color: isUser ? '#FFFFFF' : colors.text }}>
                        {text}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Photo source picker modal */}
      <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
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

      {/* Photo quota info modal */}
      <Modal visible={showQuotaInfo} transparent animationType="fade" onRequestClose={() => setShowQuotaInfo(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderRadius: 24,
            padding: 24,
            gap: 16,
            alignItems: 'center',
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}10`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="camera" size={28} color={colors.accent} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {isFr ? 'Quota de photos' : 'Photo quota'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {isFr
                ? `Tu peux envoyer ${imageQuota.limit} photos par jour pour que TchopAI analyse ta préparation en temps réel.\n\nIl te reste ${imageQuota.remaining} photo${imageQuota.remaining > 1 ? 's' : ''} aujourd'hui. Le compteur se réinitialise automatiquement chaque jour à minuit.`
                : `You can send ${imageQuota.limit} photos per day for TchopAI to analyze your cooking in real-time.\n\nYou have ${imageQuota.remaining} photo${imageQuota.remaining > 1 ? 's' : ''} remaining today. The counter resets automatically every day at midnight.`}
            </Text>
            <TouchableOpacity
              onPress={() => setShowQuotaInfo(false)}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 24,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                {isFr ? 'Compris' : 'Got it'}
              </Text>
            </TouchableOpacity>
          </View>
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
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 10,
    marginBottom: 12,
  },
  quotaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quotaBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modeSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
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
  cameraHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 32,
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
