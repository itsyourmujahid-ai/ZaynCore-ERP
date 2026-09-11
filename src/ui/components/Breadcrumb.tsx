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
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs text-muted-foreground select-none ${className}`}>
      <button 
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-brand-600" />
      </button>

      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {item.isCurrent || !item.onClick ? (
            <span className={`font-bold ${item.isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
