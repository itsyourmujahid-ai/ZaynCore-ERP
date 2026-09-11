// ============================================================================
// HR & Payroll Executive Dashboard View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Clock,
  HandCoins,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Button } from '@/ui/components/Button';
import { hrReportsService, HRDashboardMetrics } from '../services/hr-reports.service';
import { db } from '@/database/storage';
import { DbPayrollPeriod, DbEmployee } from '@/database/types';

interface HRDashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewEmployee: () => void;
  onOpenRunPayroll: () => void;
}

export const HRDashboardView: React.FC<HRDashboardViewProps> = ({
  onNavigateTab,
  onOpenNewEmployee,
  onOpenRunPayroll,
}) => {
  const { tenant } = useAuth();
  const [metrics, setMetrics] = useState<HRDashboardMetrics | null>(null);
  const [recentPeriods, setRecentPeriods] = useState<DbPayrollPeriod[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<DbEmployee[]>([]);

  const loadData = () => {
    try {
      const data = hrReportsService.getDashboardMetrics(tenant);
      setMetrics(data);
      const periods = db.getPayrollPeriods(tenant);
      setRecentPeriods(periods.slice(-5).reverse());
      const emps = db.getEmployees(tenant);
      setRecentEmployees(emps.slice(-5).reverse());
    } catch (e) {
      console.error('Failed to load HR dashboard data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Headcount"
          value={`${metrics?.totalEmployees || 0} Staff`}
          icon={<Users className="w-5 h-5 text-purple-400" />}
          subtext={`${metrics?.activeEmployees || 0} Active • ${metrics?.onLeaveEmployees || 0} On Leave`}
        />
        <MetricCard
          label="Accrued Salaries Payable"
          value={`$${parseFloat(metrics?.totalAccruedSalariesPayable || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          subtext="GL Account #2300 (Net Liability)"
        />
        <MetricCard
          label="Pending Leave Approvals"
          value={`${metrics?.pendingLeaveRequests || 0} Requests`}
          icon={<Calendar className="w-5 h-5 text-amber-400" />}
          subtext="Awaiting Manager Action"
        />
        <MetricCard
          label="Pending Advances"
          value={`${metrics?.pendingAdvancesCount || 0} Requests`}
          icon={<HandCoins className="w-5 h-5 text-cyan-400" />}
          subtext="Staff Loans Awaiting Approval"
        />
      </div>

      {/* Main Grid: Action Panel & Recent Payrolls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Payroll Periods */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Payroll Processing Pipeline"
            subtitle="Monthly payroll runs, approval lifecycle & GL integration"
            action={
              <Button variant="primary" size="sm" onClick={onOpenRunPayroll}>
                Run Payroll
              </Button>
            }
          >
            {recentPeriods.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                No payroll periods recorded yet. Click 'Run Payroll' to initialize this month's batch.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2.5">Period</th>
                      <th className="p-2.5">Employees</th>
                      <th className="p-2.5">Gross Pay</th>
                      <th className="p-2.5">Net Pay</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentPeriods.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">
                          {p.periodName}
                          <span className="block text-[10px] text-muted-foreground font-normal">{p.periodCode}</span>
                        </td>
                        <td className="p-2.5 text-foreground/90">{p.employeeCount}</td>
                        <td className="p-2.5 text-foreground">${parseFloat(p.totalGrossSalary).toFixed(2)}</td>
                        <td className="p-2.5 font-bold text-emerald-400">${parseFloat(p.totalNetSalary).toFixed(2)}</td>
                        <td className="p-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.paymentStatus === 'paid'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                            }`}
                          >
                            {p.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Core Integration Invariant Alert */}
          <div className="p-4 rounded-xl bg-card/60 border border-border text-xs text-foreground/90 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Centralized Double-Entry Accounting Invariant</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              All payroll transactions execute through the centralized <code>AccountingPostingService</code> and synchronize directly with Bank Accounts, General Ledger Accounts (<code>#6010</code> Basic, <code>#6012</code> Allowances, <code>#6015</code> Overtime, <code>#2300</code> Salaries Payable), and the Payroll Sub-Ledger with strictly <strong>$0.00 variance</strong>.
            </p>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Recent Staff */}
        <div className="space-y-6">
          <Card title="Quick Management" subtitle="Frequent HR operations">
            <div className="space-y-2.5">
              <button
                onClick={onOpenNewEmployee}
                className="w-full text-left p-3 rounded-lg bg-card/80 hover:bg-muted/80 border border-border flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">Add New Employee</div>
                  <div className="text-[11px] text-muted-foreground">Register employee master & salary structure</div>
                </div>
                <Users className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={() => onNavigateTab('attendance')}
                className="w-full text-left p-3 rounded-lg bg-card/80 hover:bg-muted/80 border border-border flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">Daily Attendance Sheet</div>
                  <div className="text-[11px] text-muted-foreground">Clock in/out, log overtime & absences</div>
                </div>
                <Clock className="w-4 h-4 text-blue-400" />
              </button>

              <button
                onClick={() => onNavigateTab('leave')}
                className="w-full text-left p-3 rounded-lg bg-card/80 hover:bg-muted/80 border border-border flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">Leave Approvals</div>
                  <div className="text-[11px] text-muted-foreground">Manage vacation, sick & unpaid leaves</div>
                </div>
                <Calendar className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="w-full text-left p-3 rounded-lg bg-card/80 hover:bg-muted/80 border border-border flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">Sub-Ledger Reconciliation</div>
                  <div className="text-[11px] text-muted-foreground">Verify Sub-Ledger ↔ GL #2300 balance</div>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </Card>

          {/* Recent Employees */}
          <Card title="Recently Added Staff" subtitle="Latest personnel records">
            {recentEmployees.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-xs">No employees registered yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentEmployees.map((e) => (
                  <div key={e.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{e.fullName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.employeeCode} • {e.jobTitle}
                      </div>
                    </div>
                    <StatusBadge status={e.employmentStatus} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
