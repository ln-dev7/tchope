import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from '@/hooks/useTranslation';

export default function NetworkBanner() {
  const isConnected = useNetworkStatus();
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [visible, setVisible] = useState(false);
  const wasOfflineRef = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the very first render to avoid flashing on app launch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      wasOfflineRef.current = !isConnected;
      if (!isConnected) {
        setVisible(true);

        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      }
      return;
    }

    if (!isConnected) {
      // Gone offline — show red banner
      wasOfflineRef.current = true;
      setVisible(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else if (wasOfflineRef.current) {
      // Back online — show green banner briefly
      wasOfflineRef.current = false;

      setVisible(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();

      // Hide after 3 seconds
      const timeout = setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
          setVisible(false);
  
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, slideAnim]);

  if (!visible) return null;

  const isOffline = !isConnected;
  const bgColor = isOffline ? '#DC2626' : '#16A34A';
  const icon = isOffline ? 'cloud-offline-outline' : 'checkmark-circle-outline';
  const message = isOffline ? t('networkOffline') : t('networkBackOnline');

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        transform: [{ translateY: slideAnim }],
      }}>
      <View
        style={{
          backgroundColor: bgColor,
          paddingTop: top + 4,
          paddingBottom: 10,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
        <Ionicons name={icon} size={16} color="#FFFFFF" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
