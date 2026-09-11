// ============================================================================
// Enterprise Metric / KPI Card (Responsive & Overflow Protected)
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';

export interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtext?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  subtext,
  className,
}) => {
  const valueStr = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  return (
    <div
      className={clsx(
        'p-4 sm:p-5 rounded-xl bg-card/80 border border-border/90 shadow-sm backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group hover:border-border transition-all min-w-0 w-full text-foreground',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate block">
            {label}
          </span>
          <div 
            className="mt-1 text-xl sm:text-2xl font-black text-foreground tracking-tight truncate" 
            title={valueStr}
          >
            {value}
          </div>
        </div>
        {icon && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtext) && (
        <div className="mt-3 pt-3 border-t border-border/70 flex items-center justify-between text-xs gap-2 min-w-0">
          {trend && (
            <span
              className={clsx(
                'font-bold inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[11px]',
                trend.isPositive 
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </span>
          )}
          {subtext && <span className="text-muted-foreground truncate" title={subtext}>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
