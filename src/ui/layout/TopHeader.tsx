// ============================================================================
// Enterprise Top Header Navigation Bar (Polished & Responsive)
// ============================================================================

import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  RotateCcw,
  Server,
  Building2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { db } from '@/database/storage';

export interface TopHeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (viewId: string) => void;
  currentView: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar, onNavigate, currentView }) => {
  const { tenant } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleResetDb = () => {
    if (confirm('Reset in-memory/localStorage ERP database back to pristine initial seed state?')) {
      db.resetDatabase();
      window.location.reload();
    }
  };

  const isSuperAdminView = currentView === 'superadmin';

  return (
    <>
      <header className="h-14 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 px-3 sm:px-5 flex items-center justify-between gap-3 z-20 select-none min-w-0 shadow-lg shadow-black/25">
        {/* Left: Sidebar Toggle & QuantumCore ERP Branding */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          <button
            onClick={onToggleSidebar}
            title="Toggle Navigation Menu"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20 ring-1 ring-white/20 shrink-0">
              Q
            </div>
            <div className="min-w-0 hidden md:block">
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>QuantumCore ERP</span>
                <span className="px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                {tenant.companyName || 'Sovereign Enterprise System'}
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-white/10 hidden xl:block mx-1" />

          {!isSuperAdminView ? (
            <div className="hidden lg:block">
              <CompanySwitcher />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold truncate shrink-0">
              <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">Platform Console</span>
            </div>
          )}
        </div>

        {/* Center: Frosted Glass Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden sm:flex items-center justify-center">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/50 hover:bg-slate-950/70 border border-white/10 hover:border-white/20 text-xs text-slate-400 hover:text-slate-200 transition-all justify-between shadow-inner"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-[11px]">Search QuantumCore ERP...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white/10 rounded border border-white/10 text-slate-300 shrink-0">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Theme Switcher + Notifications + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Interactive Color Palette Swatches (Black, Blue, Green) */}
          <ThemeSwitcher />
          {/* Platform Console Switcher for Super Admin */}
          {tenant.isPlatformAdmin && (
            <button
              onClick={() => onNavigate(isSuperAdminView ? 'dashboard' : 'superadmin')}
              title={isSuperAdminView ? "Switch to Company ERP" : "Open Super Admin Portal"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isSuperAdminView
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30'
              }`}
            >
              {isSuperAdminView ? (
                <>
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Company ERP</span>
                </>
              ) : (
                <>
                  <Server className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Super Admin Portal</span>
                </>
              )}
            </button>
          )}

          {/* Mobile Search Icon Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Search ERP (Ctrl K)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors lg:hidden shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Reset Demo Database */}
          <button
            onClick={handleResetDb}
            title="Reset Database to Seed State"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-slate-900" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-3 animate-scaleUp">
                <div className="text-xs font-bold text-slate-100 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>System Notifications</span>
                  <span className="text-[10px] font-normal text-brand-400">Audit Triggered</span>
                </div>
                <div className="py-2 space-y-2 text-xs max-h-60 overflow-y-auto">
                  {db.getAuditLogs(tenant).length > 0 ? (
                    db.getAuditLogs(tenant).slice(0, 3).map((log) => (
                      <div key={log.id} className="p-2 rounded bg-slate-800/60 border border-slate-700/50">
                        <p className="font-semibold text-slate-200 truncate">{log.action}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{log.details}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-500 text-[11px]">
                      No new notifications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Authenticated User Profile Menu & Sign Out */}
          <UserProfileMenu />
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
