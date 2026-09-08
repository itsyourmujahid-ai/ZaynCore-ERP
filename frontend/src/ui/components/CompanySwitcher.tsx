// ============================================================================
// Multi-Tenant Company & Branch Context Switcher (Adaptive Semantic Theming)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Building2, ChevronDown, Check, GitBranch } from 'lucide-react';
import { StatusBadge } from '../data-display/StatusBadge';

export const CompanySwitcher: React.FC = () => {
  const { tenant, availableCompanies, availableBranches, switchCompany, switchBranch } = useAuth();
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

  return (
    <div className="relative min-w-0 shrink" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Current Company: ${tenant.companyName}`}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-card border border-border hover:border-muted-foreground/50 text-left transition-all group max-w-[160px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-[260px] min-w-0 cursor-pointer shadow-sm"
      >
        <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate block">
              {tenant.companyName}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <span className="truncate">{tenant.branchName || 'HQ Branch'}</span>
            <span className="shrink-0">•</span>
            <span className="font-mono font-medium text-foreground shrink-0">{tenant.baseCurrency}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-card border border-border shadow-2xl z-50 p-2 animate-scaleUp">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
            <span>Switch Authorized Company</span>
            <span className="text-primary font-semibold">Tenant Isolated</span>
          </div>

          <div className="mt-1 max-h-60 overflow-y-auto space-y-1">
            {availableCompanies.map((c) => {
              const isCurrent = c.id === tenant.companyId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    switchCompany(c.id);
                    setIsOpen(false);
                  }}
                  title={c.name}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isCurrent ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1.5 rounded-lg bg-muted text-foreground shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <span className="font-mono font-medium">{c.code}</span>
                        <span>•</span>
                        <span>{c.baseCurrency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={c.tier} size="xs" />
                    {isCurrent && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>

          {availableBranches.length > 1 && (
            <>
              <div className="mt-2 pt-2 px-3 pb-1 border-t border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>Operating Branch</span>
              </div>
              <div className="space-y-1">
                {availableBranches.map((b) => {
                  const isCurrentBranch = b.id === tenant.branchId;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsOpen(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer ${
                        isCurrentBranch ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {isCurrentBranch && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
