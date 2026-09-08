// ============================================================================
// Simplified Enterprise Sidebar Navigation (Responsive & Polished)
// ============================================================================

import React from 'react';
import { clsx } from 'clsx';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { useTheme } from '@/core/theme/ThemeContext';
import { StatusBadge } from '../data-display/StatusBadge';
import { getVisibleNavItems } from '@/core/config/navigation.config';
import { X } from 'lucide-react';

export interface SidebarNavProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isCollapsed: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ 
  currentView, 
  onNavigate, 
  isCollapsed,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { tenant } = useAuth();
  const { navActiveBg, navActiveBorder, navActiveDot } = useTheme();
  const visibleNavItems = getVisibleNavItems(tenant);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'h-full bg-card border-r border-border flex flex-col transition-all duration-200 select-none shrink-0 shadow-lg',
          // Desktop positioning
          'hidden lg:flex',
          isCollapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile overlay positioning
          isOpenMobile && '!flex fixed inset-y-0 left-0 z-50 w-64 shadow-2xl animate-scaleUp'
        )}
      >
        {/* Brand & System Badge */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between">
          {(!isCollapsed || isOpenMobile) && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-md ring-1 ring-border shrink-0">
                Q
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-foreground tracking-tight block truncate">QUANTUMCORE</span>
                <span className="text-[9px] font-mono text-primary font-bold block -mt-0.5 truncate">{tenant.companyTier.toUpperCase()} EDITION</span>
              </div>
            </div>
          )}
          {isCollapsed && !isOpenMobile && (
            <div className="mx-auto w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md ring-1 ring-border">
              Q
            </div>
          )}

          {/* Mobile Close Button */}
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile?.();
                }}
                title={isCollapsed && !isOpenMobile ? item.label : undefined}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative',
                  isSelected
                    ? `${navActiveBg} ${navActiveBorder} shadow-sm`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                )}
              >
                <Icon className={clsx('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                {(!isCollapsed || isOpenMobile) && (
                  <span className="truncate flex-1 text-left font-medium tracking-wide">{item.label}</span>
                )}
                {isSelected && (!isCollapsed || isOpenMobile) && (
                  <span className={clsx('w-1.5 h-1.5 rounded-full', navActiveDot)} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tenant Context Footer */}
        {(!isCollapsed || isOpenMobile) && (
          <div className="p-3 border-t border-border bg-muted/40">
            <div className="p-2.5 rounded-xl bg-card border border-border text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Workspace</span>
                <StatusBadge status={tenant.companyTier} size="xs" />
              </div>
              <div className="font-bold text-foreground mt-1 truncate" title={tenant.companyName}>
                {tenant.companyName}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-between">
                <span>{tenant.baseCurrency} Ledger</span>
                <span className="font-mono text-primary font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
                  Isolated
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
