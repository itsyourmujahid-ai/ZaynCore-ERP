// ============================================================================
// Interactive Persona & Role Switcher (Live RBAC Evaluation Tool)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { UserCheck, ShieldCheck, ChevronDown, Check, Key } from 'lucide-react';
import { Badge } from './Badge';

export const UserRoleSwitcher: React.FC = () => {
  const { tenant, allUsers, switchUser } = useAuth();
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

  const currentUser = allUsers.find((u) => u.id === tenant.userId);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Current User: ${currentUser?.fullName} (${tenant.roles[0] || 'VIEWER'})`}
        className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-left transition-all group max-w-[130px] sm:max-w-[180px] min-w-0"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {currentUser?.fullName.charAt(0) || 'U'}
        </div>
        <div className="hidden sm:block text-left min-w-0 flex-1 overflow-hidden">
          <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
            {currentUser?.fullName.split(' ')[0]}
          </div>
          <div className="text-[10px] text-brand-400 font-medium truncate flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span className="truncate">{tenant.roles[0] || 'VIEWER'}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-2 animate-scaleUp">
          <div className="px-3 py-2 border-b border-slate-800">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Active Persona (RBAC Tester)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Switch roles to evaluate granular permissions and view restrictions in real-time.
            </p>
          </div>

          <div className="mt-1 max-h-72 overflow-y-auto space-y-1">
            {allUsers.map((u) => {
              const isSelected = u.id === tenant.userId;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setIsOpen(false);
                  }}
                  title={u.fullName}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                    isSelected ? 'bg-brand-500/10 border border-brand-500/30' : 'hover:bg-slate-800/70'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{u.fullName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                    <div className="mt-1 flex gap-1">
                      {u.isPlatformSuperAdmin ? (
                        <Badge variant="purple" size="xs">SUPER ADMIN</Badge>
                      ) : (
                        <Badge variant="default" size="xs">COMPANY USER</Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-400 mt-1 shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 px-3 py-1.5 bg-slate-950/60 rounded-md text-[10px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <Key className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Effective Permissions ({tenant.permissions.length}):</span>
            </div>
            <div className="font-mono text-[9px] text-slate-400 truncate" title={tenant.permissions.join(', ')}>
              {tenant.permissions.includes('*') ? 'ALL PLATFORM PERMISSIONS (*)' : tenant.permissions.slice(0, 4).join(', ') + '...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
