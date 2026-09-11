// ============================================================================
// Employee Final Settlement & EOSB Gratuity View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  CheckCircle,
  Send,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { DbFinalSettlement, DbEmployee } from '@/database/types';
import { db } from '@/database/storage';
import { finalSettlementService } from '../services/final-settlement.service';

export const FinalSettlementView: React.FC = () => {
  const { tenant } = useAuth();
  const [settlements, setSettlements] = useState<DbFinalSettlement[]>([]);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

  // Form states
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formTerminationDate, setFormTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [formUnpaidDays, setFormUnpaidDays] = useState(0);
  const [formBonus, setFormBonus] = useState('0.00');
  const [formNoticeDed, setFormNoticeDed] = useState('0.00');
  const [formNotes, setFormNotes] = useState('');

  const loadData = () => {
    setSettlements(db.getFinalSettlements(tenant));
    const emps = db.getEmployees(tenant);
    setEmployees(emps);
    if (emps.length > 0 && !formEmployeeId) setFormEmployeeId(emps[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      finalSettlementService.calculateSettlement(
        {
          employeeId: formEmployeeId,
          terminationDate: formTerminationDate,
          unpaidSalaryDays: formUnpaidDays,
          bonusOrIncentiveAmount: formBonus,
          noticePeriodDeductionAmount: formNoticeDed,
          notes: formNotes,
        },
        tenant
      );
      setIsCalcModalOpen(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to calculate final settlement');
    }
  };

  const handleApprove = (id: string) => {
    try {
      finalSettlementService.approveSettlement(id, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to approve settlement');
    }
  };

  const handlePost = (id: string) => {
    if (!confirm('Are you sure you want to post this final settlement to the General Ledger?')) {
      return;
    }
    try {
      finalSettlementService.postSettlement(id, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to post settlement');
    }
  };

  const totalSettledAmount = settlements
    .filter((s) => s.status === 'posted')
    .reduce((sum, s) => sum + (parseFloat(s.netSettlementAmount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Final Settlement & End of Service (EOSB)</h2>
          <p className="text-xs text-muted-foreground">
            Calculate severance, statutory gratuity, leave encashment, and settle remaining staff loans.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (employees.length > 0) setFormEmployeeId(employees[0].id);
            setIsCalcModalOpen(true);
          }}
        >
          Calculate Settlement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Settlements Processed"
          value={`${settlements.length} Cases`}
          icon={<Calculator className="w-5 h-5 text-purple-400" />}
          subtext="Separations & Terminations"
        />
        <MetricCard
          label="Total Net Severance Paid"
          value={`$${totalSettledAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          subtext="Gratuity & Unpaid Leave"
        />
        <MetricCard
          label="Pending Settlements"
          value={`${settlements.filter((s) => s.status !== 'posted').length} Pending`}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          subtext="Awaiting Approval / Posting"
        />
      </div>

      {/* Settlements Table */}
      <Card
        title={`Settlement Records (${settlements.length} cases)`}
        subtitle="Full audit trail of end of service severance calculations and GL entries"
      >
        {settlements.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            No final settlement calculations recorded. Click 'Calculate Settlement' to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Settlement #</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Termination Date</th>
                  <th className="p-3">Gratuity (EOSB)</th>
                  <th className="p-3">Leave Encashment</th>
                  <th className="p-3">Loan Recovery</th>
                  <th className="p-3">Net Settlement</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((set) => {
                  const emp = employees.find((e) => e.id === set.employeeId);
                  return (
                    <tr key={set.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{set.settlementNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{emp?.fullName || set.employeeId}</div>
                        <div className="text-[10px] text-muted-foreground">{emp?.employeeCode}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{set.terminationDate}</td>
                      <td className="p-3 text-cyan-400 font-mono">
                        ${parseFloat(set.gratuityOrSeveranceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-foreground/90 font-mono">
                        ${parseFloat(set.leaveEncashmentAmount).toFixed(2)} ({set.leaveBalanceDays} days)
                      </td>
                      <td className="p-3 text-rose-400 font-mono">
                        -${parseFloat(set.loanDeductionsAmount).toFixed(2)}
                      </td>
                      <td className="p-3 font-bold text-emerald-400 font-mono">
                        ${parseFloat(set.netSettlementAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={set.status} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {set.status === 'calculated' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                              onClick={() => handleApprove(set.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {set.status === 'approved' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => handlePost(set.id)}
                            >
                              Post to GL
                            </Button>
                          )}
                          {set.status === 'posted' && (
                            <span className="text-[10px] text-muted-foreground">Posted to GL</span>
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

      {/* Calculate Settlement Modal */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Calculate Employee Final Settlement</h2>
              <button onClick={() => setIsCalcModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleCalculate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Employee for Separation *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) - Basic: ${parseFloat(emp.basicSalary).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-foreground mb-1">Termination / Exit Date *</label>
                  <input
                    type="date"
                    required
                    value={formTerminationDate}
                    onChange={(e) => setFormTerminationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Unpaid Days in Exit Month</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={formUnpaidDays}
                    onChange={(e) => setFormUnpaidDays(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted-foreground mb-1">Severance Bonus ($)</label>
                  <input
                    type="number"
                    step="50"
                    value={formBonus}
                    onChange={(e) => setFormBonus(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Notice Period Deduction ($)</label>
                  <input
                    type="number"
                    step="50"
                    value={formNoticeDed}
                    onChange={(e) => setFormNoticeDed(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Separation Reason & Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Resignation with full statutory gratuity compliance..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsCalcModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Calculate Severance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
