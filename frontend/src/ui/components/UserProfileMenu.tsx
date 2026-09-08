// ============================================================================
// Authenticated User Profile & Logout Dropdown Menu (Adaptive Semantic Theming)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { 
  LogOut, 
  ShieldCheck, 
  ChevronDown, 
  Crown
} from 'lucide-react';
import { Badge } from './Badge';

export const UserProfileMenu: React.FC = () => {
  const { tenant, currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = currentUser?.fullName || tenant.userFullName || 'Authorized User';
  const displayEmail = currentUser?.email || tenant.userEmail || '';
  const displayRole = tenant.roles[0] || (tenant.isPlatformAdmin ? 'SUPER_ADMIN' : 'MEMBER');

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`User: ${displayName} (${displayRole})`}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card border border-border hover:border-muted-foreground/50 text-left transition-all group max-w-[150px] sm:max-w-[200px] min-w-0 shadow-sm cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ${
          tenant.isPlatformAdmin
            ? 'bg-purple-600'
            : 'bg-primary'
        }`}>
          {tenant.isPlatformAdmin ? (
            <Crown className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="hidden sm:block text-left min-w-0 flex-1 overflow-hidden">
          <div className="text-xs font-bold text-foreground truncate">
            {displayName.split(' ')[0]}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium truncate flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{displayRole}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-card border border-border shadow-2xl z-50 p-3 animate-scaleUp">
          {/* User Profile Summary */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md ${
                tenant.isPlatformAdmin
                  ? 'bg-purple-600'
                  : 'bg-primary'
              }`}>
                {tenant.isPlatformAdmin ? (
                  <Crown className="w-5 h-5 text-amber-300" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">{displayName}</div>
                <div className="text-[11px] text-muted-foreground truncate font-mono">{displayEmail}</div>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap gap-1.5">
              {tenant.isPlatformAdmin ? (
                <Badge variant="purple" size="xs">
                  PLATFORM SUPER ADMIN
                </Badge>
              ) : (
                <>
                  <Badge variant="info" size="xs">
                    {displayRole}
                  </Badge>
                  {tenant.companyName && (
                    <Badge variant="default" size="xs">
                      {tenant.companyName}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Access Info */}
          <div className="mt-2 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Security Scope:</span>
              <span className="text-foreground font-medium">
                {tenant.isPlatformAdmin ? 'Cross-Tenant Sovereign' : 'Tenant Isolated'}
              </span>
            </div>
            {!tenant.isPlatformAdmin && tenant.branchName && (
              <div className="flex items-center justify-between">
                <span>Active Branch:</span>
                <span className="text-foreground font-medium">{tenant.branchName}</span>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="mt-2 pt-2 border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full py-2 px-3 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of ERP</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
