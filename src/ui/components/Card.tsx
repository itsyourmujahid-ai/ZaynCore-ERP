// ============================================================================
// Enterprise Card Component (Polished & Responsive)
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
          'bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0 w-full text-slate-900',
          className
        )
      )}
      {...props}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-slate-50/70 min-w-0">
          <div className="min-w-0 flex-1">
            {title && <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 sm:truncate">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={clsx('flex-1 min-w-0 text-slate-800', noPadding ? 'p-0' : 'p-4 sm:p-5')}>{children}</div>
      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200/90 bg-slate-50/50 text-xs text-slate-500 min-w-0">
          {footer}
        </div>
      )}
    </div>
  );
};
