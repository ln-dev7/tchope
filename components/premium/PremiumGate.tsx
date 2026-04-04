import React from 'react';

import { useLicense } from '@/context/LicenseContext';
import TchopePlusScreen from './TchopePlusScreen';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onClose?: () => void;
}

export default function PremiumGate({ children, fallback, onClose }: PremiumGateProps) {
  const { isPremium } = useLicense();

  if (isPremium) return <>{children}</>;

  return <>{fallback ?? <TchopePlusScreen onClose={onClose} />}</>;
}
