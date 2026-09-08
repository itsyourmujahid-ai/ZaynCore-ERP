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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'h-full bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-all duration-200 select-none shrink-0 shadow-2xl shadow-black/40',
          // Desktop positioning
          'hidden lg:flex',
          isCollapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile overlay positioning
          isOpenMobile && '!flex fixed inset-y-0 left-0 z-50 w-64 shadow-2xl animate-scaleUp'
        )}
      >
        {/* Brand & System Badge */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
          {(!isCollapsed || isOpenMobile) && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/25 ring-1 ring-white/20 shrink-0">
                Q
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white tracking-tight block truncate">QUANTUMCORE</span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold block -mt-0.5 truncate">{tenant.companyTier.toUpperCase()} EDITION</span>
              </div>
            </div>
          )}
          {isCollapsed && !isOpenMobile && (
            <div className="mx-auto w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-white/20">
              Q
            </div>
          )}

          {/* Mobile Close Button */}
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 lg:hidden"
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
                    ? `${navActiveBg} ${navActiveBorder} shadow-lg backdrop-blur-md`
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                )}
              >
                <Icon className={clsx('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', isSelected ? 'text-white' : 'text-white/80')} />
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
          <div className="p-3 border-t border-white/10 bg-slate-950/30">
            <div className="p-2.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Workspace</span>
                <StatusBadge status={tenant.companyTier} size="xs" />
              </div>
              <div className="font-bold text-white mt-1 truncate" title={tenant.companyName}>
                {tenant.companyName}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>{tenant.baseCurrency} Ledger</span>
                <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
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
