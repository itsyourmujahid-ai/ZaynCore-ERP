// ============================================================================
// Declarative Authorization & Capability Guard Component
// ============================================================================

import React from 'react';
import { useAuth } from '@/modules/identity/context/AuthContext';

interface CanProps {
  permission?: string;
  module?: string;
  feature?: {
    module: string;
    key: string;
  };
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  module,
  feature,
  children,
  fallback = null,
}) => {
  const { hasPermission, isModuleEnabled, isFeatureEnabled } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (module && !isModuleEnabled(module)) {
    return <>{fallback}</>;
  }

  if (feature && !isFeatureEnabled(feature.module, feature.key)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
