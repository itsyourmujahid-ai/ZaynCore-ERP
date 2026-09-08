// ============================================================================
// Entity & Workflow Status Badge
// ============================================================================

import React from 'react';
import { Badge } from '../components/Badge';

export interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = status.toLowerCase();

  switch (norm) {
    case 'active':
    case 'open':
    case 'posted':
      return <Badge variant="success" size={size}>{status.toUpperCase()}</Badge>;
    case 'locked':
    case 'draft':
    case 'pending':
    case 'submitted':
      return <Badge variant="warning" size={size}>{status.toUpperCase()}</Badge>;
    case 'closed':
    case 'reversed':
    case 'suspended':
    case 'rejected':
      return <Badge variant="danger" size={size}>{status.toUpperCase()}</Badge>;
    case 'enterprise':
      return <Badge variant="purple" size={size}>ENTERPRISE</Badge>;
    case 'medium':
      return <Badge variant="info" size={size}>MEDIUM</Badge>;
    case 'small':
      return <Badge variant="success" size={size}>SMALL</Badge>;
    default:
      return <Badge variant="default" size={size}>{status.toUpperCase()}</Badge>;
  }
};
