// ============================================================================
// HR & Payroll Workspace (Phase 10 Architecture)
// ============================================================================

import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Plus,
  HandCoins,
  BadgePercent,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { Button } from '@/ui/components/Button';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { HRDashboardView } from './HRDashboardView';
import { EmployeeDirectoryView } from './EmployeeDirectoryView';
import { AttendanceWorkbenchView } from './AttendanceWorkbenchView';
import { LeaveWorkbenchView } from './LeaveWorkbenchView';
import { PayrollProcessingView } from './PayrollProcessingView';
import { AdvancesWorkbenchView } from './AdvancesWorkbenchView';
import { FinalSettlementView } from './FinalSettlementView';
import { SalaryStructuresView } from './SalaryStructuresView';
import { DesignationsView } from './DesignationsView';
import { HRReportsView } from './HRReportsView';

export const PayrollWorkspace: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEmployeeCreateOpen, setIsEmployeeCreateOpen] = useState(false);
  const [isPayrollCreateOpen, setIsPayrollCreateOpen] = useState(false);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'employees', label: 'Employees', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'leave', label: 'Leave', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'payroll', label: 'Payroll', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'Job Designations & Roles',
      icon: <Users className="w-3.5 h-3.5 text-blue-400" />,
      onClick: () => setActiveTab('designations'),
    },
    {
      label: 'Salary Structures & Allowances',
      icon: <BadgePercent className="w-3.5 h-3.5 text-purple-400" />,
      onClick: () => setActiveTab('structures'),
    },
    {
      label: 'Staff Loans & Advances',
      icon: <HandCoins className="w-3.5 h-3.5 text-cyan-400" />,
      onClick: () => setActiveTab('advances'),
    },
    {
      label: 'Final Settlements & Gratuity (EOSB)',
      icon: <Calculator className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setActiveTab('settlement'),
    },
    {
      label: 'Sub-Ledger vs GL #2300 Reconciliation',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => setActiveTab('reports'),
    },
  ];

  const getTabLabel = (id: string) => {
    const primary = primaryTabs.find((t) => t.id === id);
    if (primary) return primary.label;
    if (id === 'designations') return 'Job Designations';
    if (id === 'structures') return 'Salary Structures';
    if (id === 'advances') return 'Loans & Advances';
    if (id === 'settlement') return 'Final Settlements';
    return 'HR & Payroll';
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'HR & Payroll', onClick: () => setActiveTab('overview') },
          { label: getTabLabel(activeTab), isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Human Resources & Payroll
            </span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">HR & Payroll Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Employee Master, Attendance, Leave Management, Salary Structures, Payroll Engine, and GL #2300 Accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setActiveTab('employees');
              setIsEmployeeCreateOpen(true);
            }}
          >
            Add Employee
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<DollarSign className="w-4 h-4" />}
            onClick={() => {
              setActiveTab('payroll');
              setIsPayrollCreateOpen(true);
            }}
          >
            Run Payroll
          </Button>

          <DropdownMenu label="More ▾" items={moreMenuItems} align="right" />
        </div>
      </div>

      {/* 6-Tab Secondary Navigation Bar */}
      <div className="flex items-center justify-between border-b border-border pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-card font-bold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Hidden/More tab indicator if active */}
          {(activeTab === 'designations' || activeTab === 'structures' || activeTab === 'advances' || activeTab === 'settlement') && (
            <button
              className="flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 border-brand-600 text-brand-600 bg-card font-bold shadow-sm select-none whitespace-nowrap"
            >
              <span>{getTabLabel(activeTab)}</span>
            </button>
          )}
        </div>

        <div className="hidden sm:block pb-1">
          <DropdownMenu variant="ghost" label="More ▾" items={moreMenuItems} align="right" />
        </div>
      </div>

      {/* Tab View Routers */}
      {activeTab === 'overview' && (
        <HRDashboardView
          onNavigateTab={(t) => setActiveTab(t)}
          onOpenNewEmployee={() => {
            setActiveTab('employees');
            setIsEmployeeCreateOpen(true);
          }}
          onOpenRunPayroll={() => {
            setActiveTab('payroll');
            setIsPayrollCreateOpen(true);
          }}
        />
      )}

      {activeTab === 'employees' && (
        <EmployeeDirectoryView
          isCreateModalOpen={isEmployeeCreateOpen}
          onCloseCreateModal={() => setIsEmployeeCreateOpen(false)}
        />
      )}

      {activeTab === 'attendance' && <AttendanceWorkbenchView />}

      {activeTab === 'leave' && <LeaveWorkbenchView />}

      {activeTab === 'payroll' && (
        <PayrollProcessingView
          isCreateOpen={isPayrollCreateOpen}
          onCloseCreate={() => setIsPayrollCreateOpen(false)}
        />
      )}

      {activeTab === 'reports' && <HRReportsView />}

      {activeTab === 'designations' && <DesignationsView />}

      {activeTab === 'advances' && <AdvancesWorkbenchView />}

      {activeTab === 'settlement' && <FinalSettlementView />}

      {activeTab === 'structures' && <SalaryStructuresView />}
    </div>
  );
};
