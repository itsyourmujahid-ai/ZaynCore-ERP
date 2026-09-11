// ============================================================================
// Master Management Accounting & Cost Control Workspace (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  Layers, 
  Target, 
  Building2, 
  Split, 
  TrendingUp, 
  FileText, 
  LayoutDashboard,
  ArrowLeft
} from 'lucide-react';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { ManagementDashboardView } from './ManagementDashboardView';
import { CostCentersView } from './CostCentersView';
import { DepartmentBusinessUnitsView } from './DepartmentBusinessUnitsView';
import { ManagementBudgetsView } from './ManagementBudgetsView';
import { CostAllocationsView } from './CostAllocationsView';
import { ProfitabilityAnalyticsView } from './ProfitabilityAnalyticsView';
import { ManagementReportsView } from './ManagementReportsView';

export const ManagementAccountingWorkspace: React.FC<{
  initialTab?: string;
  onNavigateAccounting?: () => void;
}> = ({
  initialTab = 'overview',
  onNavigateAccounting,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'cost-centers', label: 'Cost Centers', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'departments', label: 'Departments & Units', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'budgets', label: 'Budgets & BvA', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'allocations', label: 'Cost Allocations', icon: <Split className="w-3.5 h-3.5" /> },
    { id: 'profitability', label: 'Profitability & Margins', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Management Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigateAccounting && (
            <button
              onClick={onNavigateAccounting}
              className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Return to Financial Accounting"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <Breadcrumb
              items={[
                { label: 'Accounting', onClick: onNavigateAccounting },
                { label: 'Reports & Analytics' },
                { label: 'Management Accounting' },
              ]}
            />
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Advanced Cost & Management Accounting
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30">
                PHASE 13
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div className="pt-1">
        {activeTab === 'overview' && (
          <ManagementDashboardView onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'cost-centers' && (
          <CostCentersView />
        )}

        {activeTab === 'departments' && (
          <DepartmentBusinessUnitsView />
        )}

        {activeTab === 'budgets' && (
          <ManagementBudgetsView />
        )}

        {activeTab === 'allocations' && (
          <CostAllocationsView />
        )}

        {activeTab === 'profitability' && (
          <ProfitabilityAnalyticsView />
        )}

        {activeTab === 'reports' && (
          <ManagementReportsView />
        )}
      </div>
    </div>
  );
};
