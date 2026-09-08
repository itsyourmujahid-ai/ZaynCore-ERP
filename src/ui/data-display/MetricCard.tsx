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
        'p-4 sm:p-5 rounded-xl bg-white/80 border border-slate-200/90 shadow-sm backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all min-w-0 w-full text-slate-900',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate block">
            {label}
          </span>
          <div 
            className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate" 
            title={valueStr}
          >
            {value}
          </div>
        </div>
        {icon && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-brand-50 border border-brand-200/80 text-brand-600 shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtext) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2 min-w-0">
          {trend && (
            <span
              className={clsx(
                'font-bold inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[11px]',
                trend.isPositive ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </span>
          )}
          {subtext && <span className="text-slate-500 truncate" title={subtext}>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
