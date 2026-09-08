// ============================================================================
// Master Project Management & Project Accounting Workspace (Phase 12)
// ============================================================================

import React, { useState } from 'react';
import { 
  Briefcase, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  FileText,
  Receipt,
  PieChart,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { Button } from '@/ui/components/Button';

// Subviews
import { ProjectsDashboardView } from './ProjectsDashboardView';
import { ProjectDirectoryView } from './ProjectDirectoryView';
import { ProjectBudgetsView } from './ProjectBudgetsView';
import { ProjectCostsView } from './ProjectCostsView';
import { ProjectRevenueView } from './ProjectRevenueView';
import { ProjectBillingView } from './ProjectBillingView';
import { ProjectProfitabilityView } from './ProjectProfitabilityView';
import { ProjectReportsView } from './ProjectReportsView';
import { ProjectProfileModal } from './ProjectProfileModal';

export const ProjectsWorkspace: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'projects', label: 'Projects', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'budgets', label: 'Budgets & BvA', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'costs', label: 'Costs & Ledger', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'revenue', label: 'Revenue Register', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'billing', label: 'Milestone Billing', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'profitability', label: 'Profitability', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'New Project Contract',
      icon: <Plus className="w-3.5 h-3.5 text-cyan-400" />,
      onClick: () => {
        setActiveTab('projects');
        setCreateModalOpen(true);
      },
    },
    {
      label: 'Budget vs Actual Matrix',
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => setActiveTab('budgets'),
    },
    {
      label: 'Project Financial Reports',
      icon: <PieChart className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setActiveTab('reports'),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Work In Progress (WIP) Controls',
      icon: <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />,
      onClick: () => setActiveTab('overview'),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Project Management & Accounting', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || 'Overview', isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">Enterprise Dimension</span>
            <span className="text-slate-400">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Project Management & Accounting</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Contract budgets, itemized operational costing, milestone billing, WIP capitalization, and profitability analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setActiveTab('projects');
              setCreateModalOpen(true);
            }}
          >
            Create Project
          </Button>

          <DropdownMenu
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* Tab Navigation Bar */}
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
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'overview' && (
        <ProjectsDashboardView
          onNavigateTab={setActiveTab}
          onOpenProject={(id) => setSelectedProjectId(id)}
          onCreateProject={() => {
            setActiveTab('projects');
            setCreateModalOpen(true);
          }}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectDirectoryView
          onOpenProject={(id) => setSelectedProjectId(id)}
          createModalOpen={createModalOpen}
          onCloseCreateModal={() => setCreateModalOpen(false)}
          onOpenCreateModal={() => setCreateModalOpen(true)}
        />
      )}

      {activeTab === 'budgets' && <ProjectBudgetsView />}

      {activeTab === 'costs' && <ProjectCostsView />}

      {activeTab === 'revenue' && <ProjectRevenueView />}

      {activeTab === 'billing' && <ProjectBillingView />}

      {activeTab === 'profitability' && (
        <ProjectProfitabilityView onOpenProject={(id) => setSelectedProjectId(id)} />
      )}

      {activeTab === 'reports' && <ProjectReportsView />}

      {/* 360-Degree Project Profile Modal */}
      {selectedProjectId && (
        <ProjectProfileModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onRefreshParent={() => {}}
        />
      )}
    </div>
  );
};
