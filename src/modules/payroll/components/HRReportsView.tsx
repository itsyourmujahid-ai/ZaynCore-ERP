// ============================================================================
// HR & Payroll Reports & Sub-Ledger Reconciliation View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Download,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { hrReportsService, PayrollSubLedgerReconciliation } from '../services/hr-reports.service';
import { db } from '@/database/storage';
import { DbPayrollPeriod, DbPayrollEntry } from '@/database/types';

export const HRReportsView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeReport, setActiveReport] = useState<'reconciliation' | 'payroll_register' | 'department_expense'>('reconciliation');
  const [reconciliation, setReconciliation] = useState<PayrollSubLedgerReconciliation | null>(null);
  const [periods, setPeriods] = useState<DbPayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [periodEntries, setPeriodEntries] = useState<DbPayrollEntry[]>([]);

  const loadData = () => {
    try {
      const recon = hrReportsService.getPayrollSubLedgerReconciliation(tenant);
      setReconciliation(recon);

      const pList = db.getPayrollPeriods(tenant);
      setPeriods(pList);
      if (pList.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(pList[pList.length - 1].id);
      }
    } catch (e) {
      console.error('Failed to load HR reports:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  useEffect(() => {
    if (selectedPeriodId) {
      setPeriodEntries(db.getPayrollEntries(selectedPeriodId, tenant));
    }
  }, [selectedPeriodId, tenant]);

  return (
    <div className="space-y-6">
      {/* Report Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveReport('reconciliation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeReport === 'reconciliation'
                ? 'bg-brand-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sub-Ledger ↔ GL #2300 Reconciliation
          </button>
          <button
            onClick={() => setActiveReport('payroll_register')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeReport === 'payroll_register'
                ? 'bg-brand-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Payroll Register
          </button>
          <button
            onClick={() => setActiveReport('department_expense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeReport === 'department_expense'
                ? 'bg-brand-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Department Expense Breakdown
          </button>
        </div>

        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
          Export CSV
        </Button>
      </div>

      {/* REPORT 1: Sub-Ledger ↔ GL #2300 Reconciliation */}
      {activeReport === 'reconciliation' && reconciliation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Payroll Sub-Ledger Net Payable"
              value={`$${parseFloat(reconciliation.subLedgerNetPayable).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
              subtext="Accrued Net - Disbursed"
            />
            <MetricCard
              label="GL Control Account #2300"
              value={`$${parseFloat(reconciliation.glControlAccountBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={<ShieldCheck className="w-5 h-5 text-purple-400" />}
              subtext={reconciliation.glControlAccountName}
            />
            <MetricCard
              label="Reconciliation Variance"
              value={`$${reconciliation.variance}`}
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              subtext={reconciliation.isReconciled ? 'STRICT $0.00 RECONCILED' : 'DISCREPANCY DETECTED'}
            />
          </div>

          <Card
            title="Payroll Sub-Ledger & General Ledger Audit Matrix"
            subtitle={`As of ${reconciliation.asOfDate} • Single source of truth double-entry verification`}
          >
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Reconciliation Component Summary
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    reconciliation.isReconciled
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                  }`}
                >
                  {reconciliation.isReconciled ? '✓ ZERO VARIANCE CONFIRMED' : '⚠ RECONCILIATION VARIANCE'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                  <span className="font-semibold text-slate-300 block">Sub-Ledger Accruals & Outflows:</span>
                  <div className="flex justify-between text-slate-400">
                    <span>(+) Total Posted Payroll Batches:</span>
                    <span className="text-slate-200 font-mono">${parseFloat(reconciliation.details.totalPostedPayrollAccrued).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>(+) Final Settlements Accrued:</span>
                    <span className="text-slate-200 font-mono">${parseFloat(reconciliation.details.totalFinalSettlementsAccrued).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>(-) Total Bank Salary Payments Disbursed:</span>
                    <span className="font-mono">-${parseFloat(reconciliation.details.totalSalaryPaymentsDisbursed).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-100 font-bold border-t border-slate-800 pt-1.5">
                    <span>Net Sub-Ledger Balance:</span>
                    <span className="font-mono text-emerald-400">${parseFloat(reconciliation.subLedgerNetPayable).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/60">
                  <span className="font-semibold text-slate-300 block">General Ledger Account #2300:</span>
                  <div className="flex justify-between text-slate-400">
                    <span>Control Account Code:</span>
                    <span className="text-slate-200 font-mono">{reconciliation.glControlAccountCode}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Account Description:</span>
                    <span className="text-slate-200">{reconciliation.glControlAccountName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Account Normal Balance:</span>
                    <span className="text-slate-200 font-mono">CREDIT</span>
                  </div>
                  <div className="flex justify-between text-slate-100 font-bold border-t border-slate-800 pt-1.5">
                    <span>Net GL Control Account Balance:</span>
                    <span className="font-mono text-emerald-400">${parseFloat(reconciliation.glControlAccountBalance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* REPORT 2: Monthly Payroll Register */}
      {activeReport === 'payroll_register' && (
        <Card
          title="Monthly Payroll Register"
          subtitle="Itemized employee salary register with allowances, overtime, deductions and net pay"
          action={
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodName} ({p.periodCode})
                </option>
              ))}
            </select>
          }
        >
          {periodEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No entries found for the selected payroll period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Basic Salary</th>
                    <th className="p-3">Allowances</th>
                    <th className="p-3">Overtime</th>
                    <th className="p-3">Gross Salary</th>
                    <th className="p-3">Advances Ded.</th>
                    <th className="p-3">Absence Ded.</th>
                    <th className="p-3">Total Deductions</th>
                    <th className="p-3 font-bold text-emerald-400">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {periodEntries.map((pe) => (
                    <tr key={pe.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{pe.employeeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{pe.employeeCode}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">${parseFloat(pe.basicSalary).toFixed(2)}</td>
                      <td className="p-3 font-mono text-slate-300">${parseFloat(pe.totalAllowances).toFixed(2)}</td>
                      <td className="p-3 font-mono text-amber-400">${parseFloat(pe.totalOvertime).toFixed(2)}</td>
                      <td className="p-3 font-mono font-semibold text-slate-100">${parseFloat(pe.grossSalary).toFixed(2)}</td>
                      <td className="p-3 font-mono text-rose-400">${parseFloat(pe.advanceDeductions).toFixed(2)}</td>
                      <td className="p-3 font-mono text-rose-400">${parseFloat(pe.absenceDeductions).toFixed(2)}</td>
                      <td className="p-3 font-mono text-rose-400 font-medium">-${parseFloat(pe.totalDeductions).toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">${parseFloat(pe.netSalary).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* REPORT 3: Department Expense Breakdown */}
      {activeReport === 'department_expense' && (
        <Card
          title="Department Compensation Cost Distribution"
          subtitle="Salaries, allowances, and overtime allocations by organizational department"
        >
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-xs block">Engineering & Technology</span>
                <div className="text-xl font-bold text-slate-100 mt-1">$24,500.00</div>
                <span className="text-[10px] text-slate-500">4 Employees (Basic: $18k, Allow: $4.5k, OT: $2k)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-xs block">Sales & Marketing</span>
                <div className="text-xl font-bold text-slate-100 mt-1">$16,200.00</div>
                <span className="text-[10px] text-slate-500">3 Employees (Basic: $12k, Allow: $3.2k, OT: $1k)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-xs block">Operations & Admin</span>
                <div className="text-xl font-bold text-slate-100 mt-1">$11,800.00</div>
                <span className="text-[10px] text-slate-500">2 Employees (Basic: $9k, Allow: $2.3k, OT: $500)</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
