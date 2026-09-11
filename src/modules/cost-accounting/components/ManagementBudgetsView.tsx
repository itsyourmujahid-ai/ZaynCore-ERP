// ============================================================================
// Multi-Version Management Budgets & BvA Workbench (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  GitBranch, 
  Download
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { 
  managementBudgetService, 
  BudgetVsActualReport 
} from '../services/management-budget.service';
import { costAccountingReportsService } from '../services/cost-accounting-reports.service';

export const ManagementBudgetsView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Create Form State
  const [budgetName, setBudgetName] = useState('');
  const [budgetCode, setBudgetCode] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [periodType, setPeriodType] = useState<'annual' | 'quarterly' | 'monthly'>('annual');
  const [startDate] = useState('2026-01-01');
  const [endDate] = useState('2026-12-31');
  const [budgetLines, setBudgetLines] = useState<Array<{ accountId: string; plannedAmount: string }>>([
    { accountId: '', plannedAmount: '10000.00' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  const budgets = managementBudgetService.getBudgets(tenant);
  const fiscalYears = db.getFiscalYears(tenant);
  const accounts = db.getAccounts(tenant);

  const activeBudgetId = selectedBudgetId || (budgets.length > 0 ? budgets[0].id : null);
  const bvaReport: BudgetVsActualReport | null = activeBudgetId 
    ? managementBudgetService.getBudgetVsActualReport(activeBudgetId, undefined, tenant) 
    : null;

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const validLines = budgetLines.filter((l) => l.accountId && parseFloat(l.plannedAmount) > 0);
      if (validLines.length === 0) {
        throw new Error('Please specify at least one valid account line with an amount.');
      }

      const fy = fiscalYears.find((f) => f.id === fiscalYearId) || fiscalYears[0];

      const created = managementBudgetService.createBudget({
        budgetName: budgetName.trim(),
        code: budgetCode.trim().toUpperCase(),
        fiscalYearId: fy ? fy.id : 'fy-2026',
        periodType,
        startDate: fy ? fy.startDate : startDate,
        endDate: fy ? fy.endDate : endDate,
        lines: validLines,
      }, tenant);

      setIsCreateModalOpen(false);
      setSelectedBudgetId(created.id);
      setBudgetName('');
      setBudgetCode('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create budget.');
    }
  };

  const handleApprove = (budgetId: string) => {
    try {
      managementBudgetService.approveBudget(budgetId, tenant);
      setSelectedBudgetId(budgetId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = (budgetId: string) => {
    try {
      managementBudgetService.submitBudget(budgetId, tenant);
      setSelectedBudgetId(budgetId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudgetId) return;
    try {
      const rev = managementBudgetService.createRevision(activeBudgetId, revisionReason.trim(), tenant);
      setIsRevisionModalOpen(false);
      setRevisionReason('');
      setSelectedBudgetId(rev.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    if (!activeBudgetId) return;
    const csv = costAccountingReportsService.exportBudgetVsActualToCsv(activeBudgetId, tenant);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Budget_Vs_Actual_${activeBudgetId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-400" />
            Management Budgets & Variance Analysis
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-version divisional planning, approval governance, and real-time Budget vs. Actual tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeBudgetId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export BvA CSV
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Budget
          </Button>
        </div>
      </div>

      {/* Budgets Version Register */}
      <Card
        title="Management Budget Versions"
        subtitle="Version-controlled operational plans with approval lifecycle"
      >
        <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                <th className="px-4 py-2.5">Budget Plan</th>
                <th className="px-4 py-2.5">Version</th>
                <th className="px-4 py-2.5 text-right">Planned Revenue</th>
                <th className="px-4 py-2.5 text-right">Planned Cost</th>
                <th className="px-4 py-2.5 text-right">Planned Profit</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {budgets.map((bg) => {
                const isSelected = activeBudgetId === bg.id;
                return (
                  <tr 
                    key={bg.id}
                    onClick={() => setSelectedBudgetId(bg.id)}
                    className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-500/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground">{bg.budgetName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{bg.code} • {bg.periodType.toUpperCase()}</div>
                    </td>

                    <td className="px-4 py-3 font-mono text-foreground/90">
                      v{bg.version}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      ${parseFloat(bg.totalPlannedRevenue).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-rose-400">
                      ${parseFloat(bg.totalPlannedCost).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      ${parseFloat(bg.totalPlannedProfit).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={bg.status === 'approved' ? 'approved' : bg.status === 'submitted' ? 'pending' : 'draft'} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {bg.status === 'draft' && (
                          <button
                            onClick={() => handleSubmit(bg.id)}
                            title="Submit for Approval"
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(bg.status === 'submitted' || bg.status === 'draft') && (
                          <button
                            onClick={() => handleApprove(bg.id)}
                            title="Approve Budget"
                            className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30"
                          >
                            Approve
                          </button>
                        )}
                        {bg.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedBudgetId(bg.id);
                              setIsRevisionModalOpen(true);
                            }}
                            title="Create Version Revision"
                            className="px-2 py-1 rounded text-[10px] font-bold bg-muted hover:bg-muted text-foreground/90 flex items-center gap-1"
                          >
                            <GitBranch className="w-3 h-3" /> Revise
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Real-time Budget vs Actual (BvA) Matrix */}
      {bvaReport && (
        <Card
          title={`Budget vs. Actual Matrix: ${bvaReport.budgetName} (v${bvaReport.version})`}
          subtitle={`Fiscal Year: ${bvaReport.fiscalYearName} • Real-time GL reconciliation • Base Currency: ${tenant.baseCurrency}`}
        >
          <div className="space-y-4">
            {/* Top Level Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Total Revenue (Actual vs Plan)</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    ${parseFloat(bvaReport.totalActualRevenue).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Plan: ${parseFloat(bvaReport.totalPlannedRevenue).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Total Costs (Actual vs Plan)</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-rose-400">
                    ${parseFloat(bvaReport.totalActualCost).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Plan: ${parseFloat(bvaReport.totalPlannedCost).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Net Profit Variance</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className={`font-mono text-sm font-bold ${parseFloat(bvaReport.netActualProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${parseFloat(bvaReport.netActualProfit).toFixed(2)}
                  </span>
                  <span className={`text-[11px] font-bold ${bvaReport.isOverallFavorable ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {bvaReport.isOverallFavorable ? 'FAVORABLE' : 'UNFAVORABLE'} (${parseFloat(bvaReport.profitVariance).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Matrix */}
            <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                    <th className="px-4 py-2.5">Account Code & Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Planned Budget</th>
                    <th className="px-4 py-2.5 text-right">Actual Incurred</th>
                    <th className="px-4 py-2.5 text-right">Variance ($)</th>
                    <th className="px-4 py-2.5 text-right">Variance (%)</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bvaReport.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold text-foreground">{row.accountCode}</span>
                        <span className="text-foreground/90 ml-2">{row.accountName}</span>
                      </td>

                      <td className="px-4 py-2.5 text-muted-foreground capitalize">
                        {row.accountType.replace('_', ' ')}
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono text-foreground/90">
                        ${parseFloat(row.budgetAmount).toFixed(2)}
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                        ${parseFloat(row.actualAmount).toFixed(2)}
                      </td>

                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${
                        row.isFavorable ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ${parseFloat(row.varianceAmount).toFixed(2)}
                      </td>

                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {row.variancePercentage}%
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.isFavorable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {row.isFavorable ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                          {row.isFavorable ? 'Favorable' : 'Unfavorable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Create Budget Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Management Operating Budget"
        subtitle="Establish target revenues and spending limits across General Ledger lines"
        size="lg"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Budget Plan Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. FY2026 Commercial Sales Budget"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Budget Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BUD-2026-SALES"
                value={budgetCode}
                onChange={(e) => setBudgetCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Fiscal Year</label>
              <select
                value={fiscalYearId}
                onChange={(e) => setFiscalYearId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                {fiscalYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>{fy.name} ({fy.startDate} to {fy.endDate})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Periodicity</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                <option value="annual">Annual Budget</option>
                <option value="quarterly">Quarterly Breakdown</option>
                <option value="monthly">Monthly Allocation</option>
              </select>
            </div>
          </div>

          {/* Budget Line Allocations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-foreground/90 font-medium">Account Line Allocations</label>
              <button
                type="button"
                onClick={() => setBudgetLines([...budgetLines, { accountId: '', plannedAmount: '5000.00' }])}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                + Add Account Line
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {budgetLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={line.accountId}
                    onChange={(e) => {
                      const updated = [...budgetLines];
                      updated[idx].accountId = e.target.value;
                      setBudgetLines(updated);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs"
                  >
                    <option value="">Select GL Account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.classification})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={line.plannedAmount}
                    onChange={(e) => {
                      const updated = [...budgetLines];
                      updated[idx].plannedAmount = e.target.value;
                      setBudgetLines(updated);
                    }}
                    className="w-32 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono text-xs text-right"
                  />

                  {budgetLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBudgetLines(budgetLines.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-rose-400 p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Draft Budget
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revision Modal */}
      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title="Create Budget Version Revision"
        subtitle="Increment version and create an active fork with revision justification"
        size="sm"
      >
        <form onSubmit={handleRevision} className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground/90 font-medium mb-1">Revision Justification *</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Mid-year commercial budget adjustment due to accelerated sales expansion..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Revision Fork
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
