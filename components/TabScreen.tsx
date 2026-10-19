import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTabLayout } from '@/hooks/useTabLayout';
import TchopAIButton from '@/components/TchopAI';

/** Render inside the tab scene, whose safe area includes the native bottom or side bar. */
export default function TabScreen({ children, floatingAction = true }: { children: React.ReactNode; floatingAction?: boolean }) {
  const { colors } = useTheme();
  const { fabBottom, fabRight } = useTabLayout();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    {children}
    {floatingAction && <TchopAIButton bottom={fabBottom} right={fabRight} />}
  </View>;
}
