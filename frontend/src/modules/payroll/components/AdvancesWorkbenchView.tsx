// ============================================================================
// Employee Advances & Staff Loans Workbench View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  Plus,
  CheckCircle,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { DbEmployeeAdvance, DbEmployee, DbBankAccount } from '@/database/types';
import { db } from '@/database/storage';
import { advancesService } from '../services/advances.service';

export const AdvancesWorkbenchView: React.FC = () => {
  const { tenant } = useAuth();
  const [advances, setAdvances] = useState<DbEmployeeAdvance[]>([]);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [bankAccounts, setBankAccounts] = useState<DbBankAccount[]>([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<DbEmployeeAdvance | null>(null);

  // Form states for Apply
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formPrincipal, setFormPrincipal] = useState('1000.00');
  const [formMonths, setFormMonths] = useState(5);
  const [formPurpose, setFormPurpose] = useState('');

  // Form states for Disburse
  const [disburseBankId, setDisburseBankId] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = () => {
    setAdvances(db.getEmployeeAdvances(tenant));
    const emps = db.getEmployees(tenant).filter((e) => e.isActive);
    setEmployees(emps);
    if (emps.length > 0 && !formEmployeeId) setFormEmployeeId(emps[0].id);

    const banks = db.getBankAccounts(tenant);
    setBankAccounts(banks);
    if (banks.length > 0 && !disburseBankId) setDisburseBankId(banks[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      advancesService.applyAdvance(
        {
          employeeId: formEmployeeId,
          requestDate: new Date().toISOString().split('T')[0],
          principalAmount: formPrincipal,
          repaymentMonths: formMonths,
          purpose: formPurpose,
        },
        tenant
      );
      setIsApplyModalOpen(false);
      setFormPurpose('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to request advance');
    }
  };

  const handleApprove = (id: string) => {
    try {
      advancesService.approveAdvance(id, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to approve advance');
    }
  };

  const handleOpenDisburse = (adv: DbEmployeeAdvance) => {
    setSelectedAdvance(adv);
    setIsDisburseModalOpen(true);
  };

  const handleExecuteDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance) return;
    try {
      advancesService.disburseAdvance(
        selectedAdvance.id,
        disburseBankId || bankAccounts[0]?.id,
        disburseDate,
        tenant
      );
      setIsDisburseModalOpen(false);
      setSelectedAdvance(null);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to disburse advance');
    }
  };

  const totalOutstanding = advances
    .filter((a) => a.status === 'disbursed' || a.status === 'repaying')
    .reduce((sum, a) => sum + (parseFloat(a.remainingBalance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Employee Advances & Staff Loans</h2>
          <p className="text-xs text-slate-400">
            Disburse loans from Operating Bank #1010 to Asset #1250, and track automatic payroll deductions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (employees.length > 0) setFormEmployeeId(employees[0].id);
            setIsApplyModalOpen(true);
          }}
        >
          Request Advance
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Advances Disbursed"
          value={`${advances.length} Loans`}
          icon={<HandCoins className="w-5 h-5 text-cyan-400" />}
          subtext="Cumulative Applications"
        />
        <MetricCard
          label="Active Outstanding Balance"
          value={`$${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
          subtext="GL Asset Account #1250"
        />
        <MetricCard
          label="Active Repayments"
          value={`${advances.filter((a) => a.status === 'repaying' || a.status === 'disbursed').length} Active`}
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
          subtext="Automatic Monthly Recovery"
        />
      </div>

      {/* Advances List */}
      <Card
        title={`Staff Loans & Advances (${advances.length} records)`}
        subtitle="Manage loan requests, treasury disbursement and recovery schedules"
      >
        {advances.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <HandCoins className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No advance records recorded. Click 'Request Advance' to create an application.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Advance #</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Principal</th>
                  <th className="p-3">Monthly Recovery</th>
                  <th className="p-3">Repaid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {advances.map((adv) => {
                  const emp = employees.find((e) => e.id === adv.employeeId);
                  return (
                    <tr key={adv.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">{adv.advanceNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{emp?.fullName || adv.employeeId}</div>
                        <div className="text-[10px] text-slate-500">{emp?.employeeCode}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-200 font-mono">
                        ${parseFloat(adv.principalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-slate-300 font-mono">
                        ${parseFloat(adv.monthlyDeductionAmount).toFixed(2)} / mo ({adv.repaymentMonths} mos)
                      </td>
                      <td className="p-3 text-emerald-400 font-mono font-medium">
                        ${parseFloat(adv.totalRepaid).toFixed(2)}
                      </td>
                      <td className="p-3 font-bold text-amber-400 font-mono">
                        ${parseFloat(adv.remainingBalance).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={adv.status} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {adv.status === 'draft' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                              onClick={() => handleApprove(adv.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {(adv.status === 'approved' || adv.status === 'draft') && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CreditCard className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenDisburse(adv)}
                            >
                              Disburse
                            </Button>
                          )}
                          {(adv.status === 'disbursed' || adv.status === 'repaying' || adv.status === 'fully_repaid') && (
                            <span className="text-[10px] text-slate-500">Active GL #1250</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Disburse Modal */}
      {isDisburseModalOpen && selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Disburse Loan to Staff</h2>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDisburse} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Principal Outflow</span>
                <div className="text-xl font-bold text-cyan-400 font-mono">
                  ${parseFloat(selectedAdvance.principalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400">Dr Asset #1250, Cr Bank #1010.</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Disbursement Bank Account *</label>
                <select
                  required
                  value={disburseBankId}
                  onChange={(e) => setDisburseBankId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} ({b.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  value={disburseDate}
                  onChange={(e) => setDisburseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsDisburseModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Confirm Bank Outflow
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Staff Loan Application</h2>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Employee *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Principal Amount ($) *</label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={formPrincipal}
                    onChange={(e) => setFormPrincipal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Repayment Months *</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    required
                    value={formMonths}
                    onChange={(e) => setFormMonths(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Purpose / Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="e.g. Emergency medical advance, relocation assistance..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsApplyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
