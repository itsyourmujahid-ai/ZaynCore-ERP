// ============================================================================
// Global Hierarchical Breadcrumb Navigation Component
// ============================================================================

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs text-slate-500 select-none ${className}`}>
      <button 
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-brand-600" />
      </button>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {item.isCurrent || !item.onClick ? (
            <span className={`font-bold ${item.isCurrent ? 'text-slate-900' : 'text-slate-600'}`}>
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-slate-600 hover:text-slate-900 hover:underline transition-colors"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
