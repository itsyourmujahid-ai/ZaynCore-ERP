// ============================================================================
// Management Accounting Reports & Drill-down Viewer (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Layers, 
  Target, 
  Split, 
  Filter
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { managementPnLService } from '../services/management-pnl.service';
import { costCenterService } from '../services/cost-center.service';
import { managementBudgetService } from '../services/management-budget.service';
import { costAllocationService } from '../services/cost-allocation.service';
import { costAccountingReportsService } from '../services/cost-accounting-reports.service';

export const ManagementReportsView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedReport, setSelectedReport] = useState<'pnl' | 'cost_centers' | 'bva' | 'allocations'>('pnl');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  const branches = db.getBranches(tenant);
  const departments = db.getDepartments(tenant);
  const budgets = managementBudgetService.getBudgets(tenant);

  const pnl = managementPnLService.generateManagementPnL({
    branchId: selectedBranchId || undefined,
    departmentId: selectedDepartmentId || undefined,
  }, tenant);

  const costCenters = costCenterService.getCostCenters(tenant);
  const runs = costAllocationService.getRuns(tenant);

  const handleExport = () => {
    let csv = '';
    let filename = '';

    if (selectedReport === 'pnl') {
      csv = costAccountingReportsService.exportManagementPnLToCsv(tenant);
      filename = 'Management_PnL_Statement.csv';
    } else if (selectedReport === 'cost_centers') {
      csv = costAccountingReportsService.exportCostCentersToCsv(tenant);
      filename = 'Cost_Centers_Performance_Report.csv';
    } else if (selectedReport === 'bva') {
      const budgetId = budgets.length > 0 ? budgets[0].id : 'b-1';
      csv = costAccountingReportsService.exportBudgetVsActualToCsv(budgetId, tenant);
      filename = 'Budget_Vs_Actual_Variance.csv';
    } else if (selectedReport === 'allocations') {
      csv = costAccountingReportsService.exportAllocationsToCsv(tenant);
      filename = 'Cost_Allocations_Register.csv';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'pnl', label: 'Management P&L', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'cost_centers', label: 'Cost Center Ledger', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'bva', label: 'Budget vs Actual', icon: <Target className="w-3.5 h-3.5" /> },
            { id: 'allocations', label: 'Allocation Register', icon: <Split className="w-3.5 h-3.5" /> },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                selectedReport === r.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Dimension Filter Bar */}
      <div className="p-3.5 rounded-xl bg-card/60 border border-border flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          <Filter className="w-3.5 h-3.5 text-brand-400" />
          Dimension Filters:
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Branch:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground"
          >
            <option value="">All Operating Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Department:</span>
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {(selectedBranchId || selectedDepartmentId) && (
          <button
            onClick={() => { setSelectedBranchId(''); setSelectedDepartmentId(''); }}
            className="text-[11px] text-brand-400 hover:text-brand-300 underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* REPORT CONTENT: MANAGEMENT P&L */}
      {selectedReport === 'pnl' && (
        <Card
          title="Management Statement of Profit & Loss"
          subtitle={`Authoritative General Ledger reconciliation • Base Currency: ${tenant.baseCurrency}`}
        >
          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                    <th className="px-4 py-2.5">Line Item / Account</th>
                    <th className="px-4 py-2.5 text-right">Amount ($)</th>
                    <th className="px-4 py-2.5 text-right">% of Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-card/20 font-bold text-foreground">
                    <td colSpan={3} className="px-4 py-2 text-brand-400 uppercase tracking-wider text-[11px]">1. Operating Revenue</td>
                  </tr>
                  {pnl.revenueLines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-foreground/90 pl-8">{l.accountCode} - {l.accountName}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400">${parseFloat(l.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{l.percentageOfRevenue}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-border bg-card/60 text-foreground">
                    <td className="px-4 py-2.5">Total Operating Revenue</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">${parseFloat(pnl.totalRevenue).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">100.00%</td>
                  </tr>

                  <tr className="bg-card/20 font-bold text-foreground">
                    <td colSpan={3} className="px-4 py-2 text-rose-400 uppercase tracking-wider text-[11px] pt-4">2. Direct Costs (COGS)</td>
                  </tr>
                  {pnl.directCostLines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-foreground/90 pl-8">{l.accountCode} - {l.accountName}</td>
                      <td className="px-4 py-2 text-right font-mono text-rose-400">${parseFloat(l.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{l.percentageOfRevenue}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-border bg-card/60 text-foreground">
                    <td className="px-4 py-2.5">Total Direct Costs</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-400">${parseFloat(pnl.totalDirectCosts).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{pnl.revenueLines.length > 0 ? ((parseFloat(pnl.totalDirectCosts)/parseFloat(pnl.totalRevenue))*100).toFixed(2) : '0.00'}%</td>
                  </tr>

                  <tr className="font-bold bg-card text-emerald-300 border-t border-b border-emerald-500/20">
                    <td className="px-4 py-3 text-sm">GROSS PROFIT</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">${parseFloat(pnl.grossProfit).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{pnl.grossMarginPercentage}%</td>
                  </tr>

                  <tr className="bg-card/20 font-bold text-foreground">
                    <td colSpan={3} className="px-4 py-2 text-amber-400 uppercase tracking-wider text-[11px] pt-4">3. Operating Expenses</td>
                  </tr>
                  {pnl.operatingExpenseLines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-foreground/90 pl-8">{l.accountCode} - {l.accountName}</td>
                      <td className="px-4 py-2 text-right font-mono text-rose-400">${parseFloat(l.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">{l.percentageOfRevenue}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-border bg-card/60 text-foreground">
                    <td className="px-4 py-2.5">Total Operating Expenses</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-400">${parseFloat(pnl.totalOperatingExpenses).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono"></td>
                  </tr>

                  <tr className={`font-bold text-sm ${pnl.isProfitable ? 'bg-emerald-600/20 text-emerald-300 border-t-2 border-emerald-500' : 'bg-rose-600/20 text-rose-300 border-t-2 border-rose-500'}`}>
                    <td className="px-4 py-3.5">NET MANAGEMENT PROFIT</td>
                    <td className="px-4 py-3.5 text-right font-mono">${parseFloat(pnl.netProfit).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right font-mono">{pnl.netMarginPercentage}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* REPORT CONTENT: COST CENTERS */}
      {selectedReport === 'cost_centers' && (
        <Card
          title="Cost Center Performance & Budget Variance Register"
          subtitle="All active cost center movements and net operating margin"
        >
          <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                  <th className="px-4 py-2.5">Cost Center</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5 text-right">Budget ($)</th>
                  <th className="px-4 py-2.5 text-right">Actual Incurred ($)</th>
                  <th className="px-4 py-2.5 text-right">Revenue ($)</th>
                  <th className="px-4 py-2.5 text-right">Net Margin ($)</th>
                  <th className="px-4 py-2.5 text-right">Variance ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costCenters.map((cc) => {
                  const p = costCenterService.calculateCostCenterPnL(cc.id, tenant);
                  return (
                    <tr key={cc.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-foreground">{p.costCenterCode}</div>
                        <div className="text-[11px] text-muted-foreground">{p.costCenterName}</div>
                      </td>

                      <td className="px-4 py-3 text-foreground/90">
                        {p.departmentName || 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-foreground/90">
                        ${parseFloat(p.budgetAmount).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-rose-400">
                        ${parseFloat(p.totalCost).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${parseFloat(p.actualRevenue).toFixed(2)}
                      </td>

                      <td className={`px-4 py-3 text-right font-mono font-bold ${
                        parseFloat(p.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ${parseFloat(p.netProfit).toFixed(2)}
                      </td>

                      <td className={`px-4 py-3 text-right font-mono font-bold ${
                        p.isFavorable ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ${parseFloat(p.varianceAmount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT CONTENT: ALLOCATIONS */}
      {selectedReport === 'allocations' && (
        <Card
          title="Cost Allocation Runs & Double-Entry Audit Register"
          subtitle="Systematic overhead distributions posted to General Ledger"
        >
          <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                  <th className="px-4 py-2.5">Run Number</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Amount ($)</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">GL Journal Reference</th>
                  <th className="px-4 py-2.5">Memo / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{r.runNumber}</td>
                    <td className="px-4 py-3 text-foreground/90">{r.runDate}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">${parseFloat(r.totalAllocatedAmount).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground/90 uppercase">{r.status}</span></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">{r.journalEntryId || 'Pending'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{r.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
