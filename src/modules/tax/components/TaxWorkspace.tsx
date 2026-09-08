// ============================================================================
// Master Tax & VAT Management Workspace
// ============================================================================

import React, { useState } from 'react';
import { 
  Receipt, 
  Layers, 
  Percent, 
  FileSpreadsheet, 
  Scale, 
  Landmark, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  Plus, 
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Button } from '@/ui/components/Button';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { TaxDashboardView } from './TaxDashboardView';
import { TaxConfigurationView } from './TaxConfigurationView';
import { TaxCodesView } from './TaxCodesView';
import { TaxTransactionsView } from './TaxTransactionsView';
import { TaxReturnsView } from './TaxReturnsView';
import { TaxPaymentsView } from './TaxPaymentsView';
import { TaxAdjustmentsView } from './TaxAdjustmentsView';
import { TaxReportsView } from './TaxReportsView';

export const TaxWorkspace: React.FC<{
  initialTab?: string;
  onNavigateAccounting?: () => void;
}> = ({ initialTab = 'overview', onNavigateAccounting }) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'config', label: 'Tax Configuration', icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'codes', label: 'Tax Codes & Rates', icon: <Percent className="w-3.5 h-3.5" /> },
    { id: 'transactions', label: 'Tax Transactions', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'returns', label: 'Tax Returns', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 'payments', label: 'Tax Payments', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'adjustments', label: 'Tax Adjustments', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'Zero-Variance GL Reconciliation',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => setActiveTab('reports'),
    },
    {
      label: 'General Ledger Workspace',
      icon: <RotateCcw className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => onNavigateAccounting?.(),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Tax Jurisdictions & Authorities',
      icon: <Settings className="w-3.5 h-3.5 text-slate-400" />,
      onClick: () => setActiveTab('config'),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Financial Accounting', onClick: () => onNavigateAccounting?.() },
          { label: 'Tax & VAT Management', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || 'Overview', isCurrent: true },
        ]}
      />

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              Tax & VAT Management Engine
            </span>
            <span className="text-slate-400">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Tax & VAT Management</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Centralized tax calculation, multi-jurisdiction rules, tax sub-ledger, return filing schedules, and zero-variance GL reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('returns')}
          >
            Tax Returns
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab('codes')}
          >
            New Tax Code
          </Button>

          <DropdownMenu
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-white font-bold shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block pb-1">
          <DropdownMenu
            variant="ghost"
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* WORKSPACE TAB VIEWS */}
      {activeTab === 'overview' && (
        <TaxDashboardView
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenPrepareReturn={() => setActiveTab('returns')}
          onOpenPaymentModal={() => setActiveTab('payments')}
          onOpenAdjustmentModal={() => setActiveTab('adjustments')}
        />
      )}

      {activeTab === 'config' && <TaxConfigurationView />}

      {activeTab === 'codes' && <TaxCodesView />}

      {activeTab === 'transactions' && <TaxTransactionsView />}

      {activeTab === 'returns' && <TaxReturnsView />}

      {activeTab === 'payments' && <TaxPaymentsView />}

      {activeTab === 'adjustments' && <TaxAdjustmentsView />}

      {activeTab === 'reports' && <TaxReportsView />}
    </div>
  );
};
