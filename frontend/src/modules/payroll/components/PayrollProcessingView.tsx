// ============================================================================
// Payroll Period Processing & Calculation View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  CheckCircle,
  Send,
  Eye,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { DbPayrollPeriod, DbPayrollEntry, DbBankAccount } from '@/database/types';
import { db } from '@/database/storage';
import { payrollService } from '../services/payroll.service';

interface PayrollProcessingViewProps {
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export const PayrollProcessingView: React.FC<PayrollProcessingViewProps> = ({
  isCreateOpen: propCreateOpen,
  onCloseCreate,
}) => {
  const { tenant } = useAuth();
  const [periods, setPeriods] = useState<DbPayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<DbPayrollPeriod | null>(null);
  const [periodEntries, setPeriodEntries] = useState<DbPayrollEntry[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEntriesModalOpen, setIsEntriesModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disbursingPeriod, setDisbursingPeriod] = useState<DbPayrollPeriod | null>(null);

  // Form states for Create Period
  const [formPeriodName, setFormPeriodName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPaymentDate, setFormPaymentDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form states for Disburse
  const [disburseBankId, setDisburseBankId] = useState('');
  const [disburseDate, setDisburseDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccounts, setBankAccounts] = useState<DbBankAccount[]>([]);

  const loadData = () => {
    const pList = db.getPayrollPeriods(tenant);
    setPeriods(pList.slice().reverse());
    const banks = db.getBankAccounts(tenant);
    setBankAccounts(banks);
    if (banks.length > 0 && !disburseBankId) setDisburseBankId(banks[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  useEffect(() => {
    if (propCreateOpen) {
      handleOpenCreate();
    }
  }, [propCreateOpen]);

  const handleOpenCreate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const monthNum = (now.getMonth() + 1).toString().padStart(2, '0');
    const startStr = `${year}-${monthNum}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endStr = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`;

    setFormPeriodName(`${month} ${year} Payroll`);
    setFormStartDate(startStr);
    setFormEndDate(endStr);
    setFormPaymentDate(endStr);
    setFormNotes(`Standard monthly salary run for ${month} ${year}`);
    setIsCreateModalOpen(true);
  };

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      payrollService.createPayrollPeriod(
        {
          periodName: formPeriodName,
          startDate: formStartDate,
          endDate: formEndDate,
          paymentDate: formPaymentDate,
          notes: formNotes,
        },
        tenant
      );
      setIsCreateModalOpen(false);
      if (onCloseCreate) onCloseCreate();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create payroll period');
    }
  };

  const handleCalculate = (periodId: string) => {
    try {
      const updated = payrollService.calculatePeriodPayroll(periodId, tenant);
      setSelectedPeriod(updated);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to calculate payroll');
    }
  };

  const handleViewEntries = (period: DbPayrollPeriod) => {
    const entries = db.getPayrollEntries(period.id, tenant);
    setSelectedPeriod(period);
    setPeriodEntries(entries);
    setIsEntriesModalOpen(true);
  };

  const handleApprove = (periodId: string) => {
    try {
      payrollService.approvePayrollPeriod(periodId, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to approve payroll');
    }
  };

  const handlePostToGL = (periodId: string) => {
    if (!confirm('Are you sure you want to post this payroll run to the General Ledger? This action is immutable.')) {
      return;
    }
    try {
      payrollService.postPayrollPeriod(periodId, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to post payroll to GL');
    }
  };

  const handleOpenDisburse = (period: DbPayrollPeriod) => {
    setDisbursingPeriod(period);
    setDisburseDate(period.paymentDate || new Date().toISOString().split('T')[0]);
    setIsDisburseModalOpen(true);
  };

  const handleExecuteDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbursingPeriod) return;

    try {
      payrollService.disburseSalaryPayment(
        disbursingPeriod.id,
        disburseBankId || bankAccounts[0]?.id,
        disburseDate,
        tenant
      );
      setIsDisburseModalOpen(false);
      setDisbursingPeriod(null);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to disburse salary payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Payroll Calculation & GL Processing</h2>
          <p className="text-xs text-slate-400">
            Execute decimal-precise gross-to-net calculations, post accruals to GL #2300, and disburse bank payments.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          New Payroll Period
        </Button>
      </div>

      {/* Periods List */}
      <Card
        title={`Payroll Periods (${periods.length} batches)`}
        subtitle="End-to-end processing pipeline from calculation to bank settlement"
      >
        {periods.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No payroll batches found. Click 'New Payroll Period' to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Period Batch</th>
                  <th className="p-3">Coverage Dates</th>
                  <th className="p-3">Headcount</th>
                  <th className="p-3">Gross Pay</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Payable</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Settlement</th>
                  <th className="p-3 text-right">Pipeline Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">
                      {p.periodName}
                      <span className="block text-[10px] text-slate-500 font-mono font-normal">{p.periodCode}</span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {p.startDate} → {p.endDate}
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">{p.employeeCount}</td>
                    <td className="p-3 text-slate-200 font-mono">
                      ${parseFloat(p.totalGrossSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-rose-400 font-mono">
                      -${parseFloat(p.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-bold text-emerald-400 font-mono">
                      ${parseFloat(p.totalNetSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.paymentStatus === 'paid'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'draft' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => handleCalculate(p.id)}
                          >
                            Calculate
                          </Button>
                        )}

                        {p.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleViewEntries(p)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                              title="Review Entries"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                              onClick={() => handleApprove(p.id)}
                            >
                              Approve
                            </Button>
                          </>
                        )}

                        {p.status === 'approved' && (
                          <>
                            <button
                              onClick={() => handleViewEntries(p)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                              title="Review Entries"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => handlePostToGL(p.id)}
                            >
                              Post to GL
                            </Button>
                          </>
                        )}

                        {p.status === 'posted' && p.paymentStatus !== 'paid' && (
                          <>
                            <button
                              onClick={() => handleViewEntries(p)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                              title="Review Entries"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CreditCard className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenDisburse(p)}
                            >
                              Disburse
                            </Button>
                          </>
                        )}

                        {(p.status === 'paid' || p.status === 'closed') && (
                          <button
                            onClick={() => handleViewEntries(p)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                            title="View Payslips"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Entries Modal */}
      {isEntriesModalOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Payroll Review: {selectedPeriod.periodName}
                </h2>
                <p className="text-xs text-slate-400">
                  {periodEntries.length} Employee Pay Slips • Net Total: ${parseFloat(selectedPeriod.totalNetSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button onClick={() => setIsEntriesModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                <thead className="bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="p-2.5">Employee</th>
                    <th className="p-2.5">Basic</th>
                    <th className="p-2.5">Allowances</th>
                    <th className="p-2.5">Overtime</th>
                    <th className="p-2.5">Gross</th>
                    <th className="p-2.5">Advances Ded.</th>
                    <th className="p-2.5">Absence Ded.</th>
                    <th className="p-2.5 font-bold text-emerald-400">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {periodEntries.map((pe) => (
                    <tr key={pe.id}>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-200">{pe.employeeName}</div>
                        <div className="text-[10px] text-slate-500">{pe.employeeCode}</div>
                      </td>
                      <td className="p-2.5 text-slate-300 font-mono">${parseFloat(pe.basicSalary).toFixed(2)}</td>
                      <td className="p-2.5 text-slate-300 font-mono">${parseFloat(pe.totalAllowances).toFixed(2)}</td>
                      <td className="p-2.5 text-amber-400 font-mono">${parseFloat(pe.totalOvertime).toFixed(2)}</td>
                      <td className="p-2.5 text-slate-100 font-semibold font-mono">${parseFloat(pe.grossSalary).toFixed(2)}</td>
                      <td className="p-2.5 text-rose-400 font-mono">${parseFloat(pe.advanceDeductions).toFixed(2)}</td>
                      <td className="p-2.5 text-rose-400 font-mono">${parseFloat(pe.absenceDeductions).toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-emerald-400 font-mono">${parseFloat(pe.netSalary).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsEntriesModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Bank Salary Payment Modal */}
      {isDisburseModalOpen && disbursingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Disburse Salary Payments</h2>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDisbursement} className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Total Net Disbursement</span>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  ${parseFloat(disbursingPeriod.totalNetSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400">
                  Discharges GL Liability #2300 via Banking Outflow.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Source Bank Account *</label>
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
                  Confirm Bank Disbursement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Period Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Initialize Payroll Period</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  if (onCloseCreate) onCloseCreate();
                }}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Period Batch Name *</label>
                <input
                  type="text"
                  required
                  value={formPeriodName}
                  onChange={(e) => setFormPeriodName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formPaymentDate}
                  onChange={(e) => setFormPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Batch Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    if (onCloseCreate) onCloseCreate();
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Batch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
