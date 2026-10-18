import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastPreset = 'done' | 'error' | 'heart' | 'custom';

type ToastContextType = {
  toast: (title: string, preset?: ToastPreset) => void;
};

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const presetConfig: Record<ToastPreset, { icon: string; bg: string; iconColor: string }> = {
  done: { icon: 'checkmark-circle', bg: '#41634B', iconColor: '#FFFFFF' },
  error: { icon: 'close-circle', bg: '#B02500', iconColor: '#FFFFFF' },
  heart: { icon: 'heart', bg: '#AE302E', iconColor: '#FFFFFF' },
  custom: { icon: 'information-circle', bg: '#A84027', iconColor: '#FFFFFF' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [preset, setPreset] = useState<ToastPreset>('done');
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const toast = useCallback((title: string, p: ToastPreset = 'done') => {
    Haptics.notificationAsync(
      p === 'error'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Success
    );

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setMessage(title);
    setPreset(p);
    setVisible(true);

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 2200);
  }, []);

  const config = presetConfig[preset];

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}>
          <View style={[styles.toast, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon as any} size={20} color={config.iconColor} />
            <Text style={styles.text} numberOfLines={1}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 99999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
