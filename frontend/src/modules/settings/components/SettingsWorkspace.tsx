// ============================================================================
// Unified Enterprise Settings & Governance Workspace (Phase 2 & Phase 15)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  Activity,
  Coins,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { CompanyManagementView } from '@/modules/companies/components/CompanyManagementView';
import { FiscalPeriodsView } from '@/modules/companies/components/FiscalPeriodsView';
import { RolePermissionManager } from '@/modules/authorization/components/RolePermissionManager';
import { ModuleRegistryView } from '@/modules/registry/components/ModuleRegistryView';
import { AuditTrailView } from '@/modules/audit/components/AuditTrailView';
import { BusinessConfigurationView } from './BusinessConfigurationView';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { Card } from '@/ui/components/Card';

export const SettingsWorkspace: React.FC<{ initialTab?: string; onNavigate?: (viewId: string) => void }> = ({ 
  initialTab = 'general',
  onNavigate = () => {} 
}) => {
  const { tenant } = useAuth();
  const [activeCategory, setActiveCategory] = useState(
    initialTab === 'company' ? 'general' :
    initialTab === 'business' ? 'business' :
    initialTab === 'periods' ? 'accounting' :
    initialTab === 'rbac' ? 'people' :
    initialTab === 'capabilities' ? 'modules' :
    initialTab === 'audit' ? 'system' : initialTab
  );

  const categories = [
    { id: 'general', label: 'General & Organization', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'business', label: 'Business & Operations Model', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'people', label: 'People & Access', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'accounting', label: 'Fiscal & Accounting', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'modules', label: 'Modules & Entitlements', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'System & Security Log', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Settings & Administration', onClick: () => setActiveCategory('general') },
          { label: categories.find((c) => c.id === activeCategory)?.label || 'General', isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise Administration</span>
            <span className="text-slate-400">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Settings & Governance</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage company structure, business configurations, UOM conversions, fiscal periods, RBAC permissions, and immutable audit logs.
          </p>
        </div>
      </div>

      {/* Categorized Tab Bar */}
      <div className="flex items-center border-b border-slate-200 pb-px gap-1 overflow-x-auto">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-white font-bold shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Categorized Content */}
      {activeCategory === 'general' && (
        <CompanyManagementView />
      )}

      {activeCategory === 'business' && (
        <BusinessConfigurationView />
      )}

      {activeCategory === 'people' && (
        <RolePermissionManager />
      )}

      {activeCategory === 'accounting' && (
        <div className="space-y-6">
          <FiscalPeriodsView />
          
          <Card title="Ledger Currency & Multi-Currency Setup" subtitle="Base currency and FX exchange rate configuration">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-100 text-brand-700">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Primary Base Currency: {tenant.baseCurrency}</span>
                  <span className="text-slate-600 text-[11px]">All General Ledger debits and credits are posted and balanced in {tenant.baseCurrency}.</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </Card>
        </div>
      )}

      {activeCategory === 'modules' && (
        <ModuleRegistryView onNavigate={onNavigate} />
      )}

      {activeCategory === 'system' && (
        <AuditTrailView />
      )}
    </div>
  );
};
