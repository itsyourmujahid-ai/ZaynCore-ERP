// ============================================================================
// Zero-Float Error Financial Amount Display
// ============================================================================

import React from 'react';
import { formatMoney } from '@/core/utils/money';
import { clsx } from 'clsx';

export interface FinancialAmountProps {
  amount: string | number;
  currency?: string;
  decimals?: number;
  showDebitCreditIndicator?: boolean;
  type?: 'debit' | 'credit' | 'neutral';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FinancialAmount: React.FC<FinancialAmountProps> = ({
  amount,
  currency = 'USD',
  decimals = 2,
  showDebitCreditIndicator = false,
  type = 'neutral',
  className,
  size = 'md',
}) => {
  const formatted = formatMoney(amount, currency, decimals);
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  const isNegative = num < 0;

  const sizeClasses = {
    sm: 'text-xs font-mono',
    md: 'text-sm font-mono font-medium',
    lg: 'text-lg font-mono font-semibold',
    xl: 'text-2xl font-mono font-bold tracking-tight',
  };

  const typeColors = {
    debit: 'text-emerald-400',
    credit: 'text-sky-400',
    neutral: isNegative ? 'text-rose-400' : 'text-slate-100',
  };

  return (
    <span className={clsx('inline-flex items-center gap-1 tabular-nums', sizeClasses[size], typeColors[type], className)}>
      <span>{formatted}</span>
      {showDebitCreditIndicator && (
        <span className="text-[10px] font-sans uppercase font-bold text-slate-400">
          {type === 'debit' ? 'Dr' : type === 'credit' ? 'Cr' : ''}
        </span>
      )}
    </span>
  );
};
