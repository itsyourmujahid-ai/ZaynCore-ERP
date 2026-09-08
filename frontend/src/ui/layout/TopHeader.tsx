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
      <header className="h-14 bg-card border-b border-border px-3 sm:px-5 flex items-center justify-between gap-3 z-20 select-none min-w-0 shadow-sm">
        {/* Left: Sidebar Toggle & Enterprise Branding */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          <button
            onClick={onToggleSidebar}
            title="Toggle Navigation Menu"
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm ring-1 ring-border shrink-0">
              Q
            </div>
            <div className="min-w-0 hidden md:block">
              <div className="text-xs font-black tracking-tight text-foreground flex items-center gap-1.5 truncate">
                <span>QuantumCore ERP</span>
                <span className="px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium truncate">
                {tenant.companyName || 'Sovereign Enterprise System'}
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-border hidden xl:block mx-1" />

          {!isSuperAdminView ? (
            <div className="hidden lg:block">
              <CompanySwitcher />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold truncate shrink-0">
              <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">Platform Console</span>
            </div>
          )}
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 hidden sm:flex items-center justify-center">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background hover:bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-all justify-between shadow-inner"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-[11px]">Search QuantumCore ERP...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted rounded border border-border text-foreground shrink-0">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Theme Switcher + Notifications + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Interactive Color Palette Swatches (Black, Blue, Green) + Mode Toggle */}
          <ThemeSwitcher />

          {/* Platform Console Switcher for Super Admin */}
          {tenant.isPlatformAdmin && (
            <button
              onClick={() => onNavigate(isSuperAdminView ? 'dashboard' : 'superadmin')}
              title={isSuperAdminView ? "Switch to Company ERP" : "Open Super Admin Portal"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isSuperAdminView
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-600/30'
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Reset Demo Database */}
          <button
            onClick={handleResetDb}
            title="Reset Database to Seed State"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-card border border-border shadow-2xl z-50 p-3 animate-scaleUp">
                <div className="text-xs font-bold text-foreground pb-2 border-b border-border flex items-center justify-between">
                  <span>System Notifications</span>
                  <span className="text-[10px] font-semibold text-primary">Audit Triggered</span>
                </div>
                <div className="py-2 space-y-2 text-xs max-h-60 overflow-y-auto">
                  {db.getAuditLogs(tenant).length > 0 ? (
                    db.getAuditLogs(tenant).slice(0, 3).map((log) => (
                      <div key={log.id} className="p-2 rounded bg-muted/60 border border-border">
                        <p className="font-semibold text-foreground truncate">{log.action}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{log.details}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-[11px]">
                      No new notifications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

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
