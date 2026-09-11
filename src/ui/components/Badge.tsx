// ============================================================================
// Enterprise Badge Component
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  icon,
  children,
  className,
}) => {
  const base = 'inline-flex items-center font-medium rounded-md border select-none';

  const variants = {
    default: 'bg-muted text-foreground/90 border-border font-semibold',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    info: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
    outline: 'bg-card text-foreground/90 border-border font-semibold',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], sizes[size], className))}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
