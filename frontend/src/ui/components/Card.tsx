// ============================================================================
// Enterprise Card Component (Adaptive Semantic Theming & High Contrast)
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  noPadding = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0 w-full',
          className
        )
      )}
      {...props}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-muted/30 min-w-0">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm font-bold text-foreground tracking-tight truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:truncate">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={clsx('flex-1 min-w-0 text-foreground', noPadding ? 'p-0' : 'p-4 sm:p-5')}>{children}</div>
      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground min-w-0">
          {footer}
        </div>
      )}
    </div>
  );
};
