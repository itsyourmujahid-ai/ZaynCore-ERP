// ============================================================================
// Group Consolidation Financial Statements Workbench (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Tabs } from '@/ui/components/Tabs';
import { consolidationEngineService } from '../services/consolidation-engine.service';
import { eliminationEngineService } from '../services/elimination-engine.service';
import { companyRelationshipService } from '../services/company-relationship.service';

export const ConsolidationWorkbenchView: React.FC = () => {
  const { tenant } = useAuth();
  const groups = companyRelationshipService.getGroups();
  const sets = consolidationEngineService.getConsolidationSets();
  const runs = consolidationEngineService.getConsolidationRuns();
  const companies = db.getCompanies();

  const [activeTab, setActiveTab] = useState<'tb' | 'pnl' | 'bs' | 'cf' | 'eliminations'>('tb');
  const [selectedSetId, setSelectedSetId] = useState(sets[0]?.id || '');
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id || '');

  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isElimModalOpen, setIsElimModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [setForm, setSetForm] = useState({
    groupId: groups[0]?.id || '',
    name: '',
    code: '',
    parentCompanyId: tenant.companyId,
    participatingCompanyIds: companies.map((c) => c.id),
    reportingCurrency: 'USD',
  });

  const [runForm, setRunForm] = useState({
    consolidationSetId: selectedSetId || sets[0]?.id || '',
    fiscalYearId: 'fy-2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    reportingCurrency: 'USD',
  });

  const [elimForm, setElimForm] = useState({
    reason: '',
    totalAmount: '10000.00',
    company1Id: companies[0]?.id || '',
    groupAccount1Id: '',
    company2Id: companies[1]?.id || companies[0]?.id || '',
    groupAccount2Id: '',
  });

  const currentRun = runs.find((r) => r.id === selectedRunId) || runs[0];
  const tbReport = currentRun ? consolidationEngineService.generateConsolidatedTrialBalance(currentRun.id, tenant) : null;
  const pnlReport = currentRun ? consolidationEngineService.generateConsolidatedPnL(currentRun.id, tenant) : null;
  const bsReport = currentRun ? consolidationEngineService.generateConsolidatedBalanceSheet(currentRun.id, tenant) : null;
  const cfReport = currentRun ? consolidationEngineService.generateConsolidatedCashFlow(currentRun.id, tenant) : null;
  const adjustments = currentRun ? eliminationEngineService.getAdjustments(currentRun.id) : [];

  const handleCreateSet = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const s = consolidationEngineService.createConsolidationSet(setForm, tenant);
      setSelectedSetId(s.id);
      setIsSetModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create consolidation set.');
    }
  };

  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const r = consolidationEngineService.createConsolidationRun({
        ...runForm,
        consolidationSetId: selectedSetId || sets[0]?.id || '',
      }, tenant);
      setSelectedRunId(r.id);
      setIsRunModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate consolidation run.');
    }
  };

  const handleCreateElimination = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const gAccounts = db.getGroupChartOfAccounts();
      const ga1 = elimForm.groupAccount1Id || gAccounts[0]?.id || 'gacc-1';
      const ga2 = elimForm.groupAccount2Id || gAccounts[1]?.id || gAccounts[0]?.id || 'gacc-2';

      eliminationEngineService.createAdjustment({
        consolidationRunId: currentRun.id,
        adjustmentType: 'elimination',
        reason: elimForm.reason || 'Intercompany elimination',
        affectingCompanyIds: [elimForm.company1Id, elimForm.company2Id],
        totalAmount: elimForm.totalAmount,
        currency: currentRun.reportingCurrency,
        lines: [
          {
            companyId: elimForm.company1Id,
            groupAccountId: ga1,
            debitAmount: elimForm.totalAmount,
            creditAmount: '0.0000',
            description: `Debit Elimination: ${elimForm.reason}`,
          },
          {
            companyId: elimForm.company2Id,
            groupAccountId: ga2,
            debitAmount: '0.0000',
            creditAmount: elimForm.totalAmount,
            description: `Credit Elimination: ${elimForm.reason}`,
          },
        ],
      }, tenant);

      setIsElimModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create elimination adjustment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Financial Consolidation</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status="Reporting Layer" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Consolidation Financial Statements</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Produce non-mutating Consolidated Trial Balances, P&L, Balance Sheets, and Cash Flows with automated intercompany eliminations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsSetModalOpen(true)}
            disabled={groups.length === 0}
          >
            Consolidation Set
          </Button>
          <Button
            variant="primary"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setIsRunModalOpen(true)}
            disabled={sets.length === 0}
          >
            Generate Run
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Control Bar: Set & Run Switcher */}
      <div className="p-4 bg-card/60 border border-border rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Consolidation Scope / Set</label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {sets.length === 0 ? (
                <option value="">No consolidation sets created</option>
              ) : (
                sets.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.reportingCurrency})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-muted-foreground font-medium block mb-1">Financial Period Run</label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
            >
              {runs.length === 0 ? (
                <option value="">No runs computed</option>
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id}>{r.startDate} to {r.endDate} ({r.reportingCurrency})</option>
                ))
              )}
            </select>
          </div>
        </div>

        {currentRun && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-mono">
              Currency: <strong className="text-cyan-400 font-bold">{currentRun.reportingCurrency}</strong>
            </span>
            <StatusBadge status={currentRun.status} size="sm" />
          </div>
        )}
      </div>

      {/* Financial Statement Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'tb', label: 'Consolidated Trial Balance' },
          { id: 'pnl', label: 'Consolidated P&L' },
          { id: 'bs', label: 'Consolidated Balance Sheet' },
          { id: 'cf', label: 'Consolidated Cash Flow' },
          { id: 'eliminations', label: `Elimination Adjustments (${adjustments.length})` },
        ]}
      />

      {/* TAB 1: Consolidated Trial Balance */}
      {activeTab === 'tb' && (
        <Card
          title="Consolidated General Ledger Trial Balance"
          subtitle={tbReport ? `${tbReport.participatingCompanies.length} entities aggregated into ${tbReport.reportingCurrency}` : 'Trial Balance'}
        >
          {tbReport ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Group Code</th>
                    <th className="py-2.5 px-3 font-semibold">Standard Account Name</th>
                    {tbReport.participatingCompanies.map((c) => (
                      <th key={c.id} className="py-2.5 px-3 font-semibold text-right">
                        {c.name} ({c.baseCurrency})
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold text-right text-amber-400">Eliminations</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">Consolidated Net ({tbReport.reportingCurrency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/90">
                  {tbReport.rows.map((r) => (
                    <tr key={r.groupAccountId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{r.groupAccountCode}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{r.groupAccountName}</td>
                      {tbReport.participatingCompanies.map((c) => (
                        <td key={c.id} className="py-2.5 px-3 text-right font-mono text-foreground/90">
                          {r.companyBalances[c.id]?.net || '0.00'}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {parseFloat(r.eliminationDebit) > 0 ? `+${r.eliminationDebit}` : parseFloat(r.eliminationCredit) > 0 ? `-${r.eliminationCredit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {r.consolidatedNet}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold bg-card/60">
                    <td colSpan={2} className="py-3 px-3 text-foreground uppercase tracking-wider">Total Consolidated Balance</td>
                    <td colSpan={tbReport.participatingCompanies.length} className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">Balanced</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">
                      Dr ${tbReport.totalConsolidatedDebit} / Cr ${tbReport.totalConsolidatedCredit}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No consolidation run selected. Click 'Generate Run' to compute consolidated trial balance.
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Consolidated Statement of Profit & Loss */}
      {activeTab === 'pnl' && pnlReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <span className="text-xs text-muted-foreground font-medium">Consolidated Revenue</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">${pnlReport.consolidatedRevenue}</div>
              <div className="text-[10px] text-muted-foreground mt-2">Eliminated: -${pnlReport.intercompanyRevenueElimination}</div>
            </Card>
            <Card>
              <span className="text-xs text-muted-foreground font-medium">Gross Profit</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">${pnlReport.grossProfit}</div>
              <div className="text-[10px] text-muted-foreground mt-2">Margin: {pnlReport.grossMarginPercent}</div>
            </Card>
            <Card>
              <span className="text-xs text-muted-foreground font-medium">Consolidated Operating Profit</span>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">${pnlReport.operatingProfit}</div>
              <div className="text-[10px] text-muted-foreground mt-2">EBIT equivalent</div>
            </Card>
            <Card>
              <span className="text-xs text-muted-foreground font-medium">Net Group Profit</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">${pnlReport.netGroupProfit}</div>
              <div className="text-[10px] text-muted-foreground mt-2">Parent Share: ${pnlReport.parentShareProfit}</div>
            </Card>
          </div>

          <Card title="Corporate Group Statement of Profit & Loss" subtitle={`Consolidated Period: ${pnlReport.period}`}>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between font-medium">
                <span className="text-foreground">1. Gross Operating Revenue</span>
                <span className="font-mono text-foreground font-bold">${pnlReport.operatingRevenue}</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between text-amber-400">
                <span>Less: Intercompany Sales Elimination</span>
                <span className="font-mono font-bold">-${pnlReport.intercompanyRevenueElimination}</span>
              </div>
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between text-emerald-400 font-bold">
                <span>Consolidated Net Revenue</span>
                <span className="font-mono text-sm">${pnlReport.consolidatedRevenue}</span>
              </div>

              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between font-medium">
                <span className="text-foreground">2. Cost of Sales & Direct Overheads</span>
                <span className="font-mono text-foreground font-bold">${pnlReport.costOfSales}</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between text-amber-400">
                <span>Less: Intercompany COGS Elimination</span>
                <span className="font-mono font-bold">-${pnlReport.intercompanyCogsElimination}</span>
              </div>
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-lg flex items-center justify-between text-cyan-400 font-bold">
                <span>Consolidated Gross Profit</span>
                <span className="font-mono text-sm">${pnlReport.grossProfit} ({pnlReport.grossMarginPercent})</span>
              </div>

              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between font-medium">
                <span className="text-foreground">3. Operating Expenses (Salaries, Rent, IT, Admin)</span>
                <span className="font-mono text-foreground font-bold">${pnlReport.consolidatedOperatingExpenses}</span>
              </div>

              <div className="p-4 bg-emerald-900/30 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-300 font-bold text-sm">
                <span>Consolidated Net Group Profit</span>
                <span className="font-mono text-base">${pnlReport.netGroupProfit}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                <div className="p-3 bg-card/60 border border-border rounded-lg flex items-center justify-between">
                  <span className="text-muted-foreground">Parent Shareholders' Equity Share:</span>
                  <span className="font-mono font-bold text-foreground">${pnlReport.parentShareProfit}</span>
                </div>
                <div className="p-3 bg-card/60 border border-border rounded-lg flex items-center justify-between">
                  <span className="text-muted-foreground">Non-Controlling / Minority Interest Share:</span>
                  <span className="font-mono font-bold text-amber-400">${pnlReport.nonControllingInterestShare}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Consolidated Balance Sheet */}
      {activeTab === 'bs' && bsReport && (
        <Card title="Consolidated Statement of Financial Position (Balance Sheet)" subtitle={`As of ${bsReport.asOfDate}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <div className="font-bold text-sm text-foreground pb-2 border-b border-border">ASSETS</div>
              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between">
                <span className="text-foreground/90">Current Assets (Cash, Receivables, Inventory)</span>
                <span className="font-mono font-bold text-foreground">${bsReport.currentAssets}</span>
              </div>
              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between">
                <span className="text-foreground/90">Non-Current Assets (Equipment, Buildings, WIP)</span>
                <span className="font-mono font-bold text-foreground">${bsReport.nonCurrentAssets}</span>
              </div>
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between font-bold text-emerald-400">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-sm">${bsReport.totalAssets}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <div className="font-bold text-sm text-foreground pb-2 border-b border-border">LIABILITIES & EQUITY</div>
              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between">
                <span className="text-foreground/90">Current Liabilities (Trade Payables, Accrued Taxes)</span>
                <span className="font-mono font-bold text-foreground">${bsReport.currentLiabilities}</span>
              </div>
              <div className="p-3 bg-card/60 rounded-lg flex items-center justify-between">
                <span className="text-foreground/90">Non-Current Liabilities (Term Loans)</span>
                <span className="font-mono font-bold text-foreground">${bsReport.nonCurrentLiabilities}</span>
              </div>
              <div className="p-3 bg-card/60 border border-border rounded-lg flex items-center justify-between">
                <span className="text-foreground/90">Parent Shareholders' Equity & Retained Earnings</span>
                <span className="font-mono font-bold text-foreground">${bsReport.parentEquity}</span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between text-amber-400">
                <span>Non-Controlling / Minority Interest</span>
                <span className="font-mono font-bold">${bsReport.nonControllingInterest}</span>
              </div>
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between font-bold text-emerald-400">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-sm">${bsReport.totalLiabilitiesAndEquity}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: Consolidated Cash Flow */}
      {activeTab === 'cf' && cfReport && (
        <Card title="Consolidated Statement of Cash Flows" subtitle={`Period: ${cfReport.period}`}>
          <div className="space-y-3 text-xs max-w-2xl">
            <div className="p-3.5 bg-card/60 rounded-lg flex items-center justify-between">
              <span className="text-foreground font-medium">1. Net Cash from Operating Activities</span>
              <span className="font-mono font-bold text-emerald-400">${cfReport.operatingCashFlow}</span>
            </div>
            <div className="p-3.5 bg-card/60 rounded-lg flex items-center justify-between">
              <span className="text-foreground font-medium">2. Net Cash used in Investing Activities (CapEx)</span>
              <span className="font-mono font-bold text-rose-400">${cfReport.investingCashFlow}</span>
            </div>
            <div className="p-3.5 bg-card/60 rounded-lg flex items-center justify-between">
              <span className="text-foreground font-medium">3. Net Cash from Financing Activities</span>
              <span className="font-mono font-bold text-indigo-400">${cfReport.financingCashFlow}</span>
            </div>
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between font-bold text-emerald-400">
              <span>Net Increase / (Decrease) in Cash & Cash Equivalents</span>
              <span className="font-mono text-sm">${cfReport.netCashIncrease}</span>
            </div>
            <div className="p-3.5 bg-card/80 border border-border rounded-lg flex items-center justify-between font-bold text-foreground">
              <span>Ending Cash & Liquid Bank Position</span>
              <span className="font-mono text-cyan-400">${cfReport.endingCash}</span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: Elimination Adjustments Manager */}
      {activeTab === 'eliminations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsElimModalOpen(true)}
              disabled={!currentRun}
            >
              Add Elimination Adjustment
            </Button>
          </div>

          <Card title="Consolidation Layer Elimination Adjustments" subtitle="Non-mutating adjustments applied strictly to consolidation statements">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Adjustment #</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Reason</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/90">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                        No elimination adjustments recorded for this consolidation run.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-amber-400">{adj.adjustmentNumber}</td>
                        <td className="py-3 px-3 capitalize text-foreground/90">{adj.adjustmentType}</td>
                        <td className="py-3 px-3 text-foreground">{adj.reason}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                          {adj.totalAmount} {adj.currency}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={adj.status} size="xs" />
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          {adj.status === 'draft' && (
                            <Button size="sm" variant="secondary" onClick={() => eliminationEngineService.approveAdjustment(adj.id, tenant)}>
                              Approve
                            </Button>
                          )}
                          {adj.status === 'approved' && (
                            <Button size="sm" variant="primary" onClick={() => eliminationEngineService.postAdjustment(adj.id, tenant)}>
                              Commit to Layer
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Create Consolidation Set */}
      <Modal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        title="Create Consolidation Set Scope"
      >
        <form onSubmit={handleCreateSet} className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground/90 font-medium mb-1">Set Code</label>
            <input
              type="text"
              required
              placeholder="e.g. CSET-FULL-GRP"
              value={setForm.code}
              onChange={(e) => setSetForm({ ...setForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Set Description Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Full Group Consolidated Financials"
              value={setForm.name}
              onChange={(e) => setSetForm({ ...setForm, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Parent Holding Entity</label>
            <select
              value={setForm.parentCompanyId}
              onChange={(e) => setSetForm({ ...setForm, parentCompanyId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Consolidation Reporting Currency</label>
            <select
              value={setForm.reportingCurrency}
              onChange={(e) => setSetForm({ ...setForm, reportingCurrency: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="OMR">OMR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
              <option value="SAR">SAR</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsSetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Set
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Generate Run */}
      <Modal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        title="Generate Consolidation Financial Run"
      >
        <form onSubmit={handleCreateRun} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Period Start Date</label>
              <input
                type="date"
                required
                value={runForm.startDate}
                onChange={(e) => setRunForm({ ...runForm, startDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
              />
            </div>
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Period End Date</label>
              <input
                type="date"
                required
                value={runForm.endDate}
                onChange={(e) => setRunForm({ ...runForm, endDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Compute Run
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Elimination */}
      <Modal
        isOpen={isElimModalOpen}
        onClose={() => setIsElimModalOpen(false)}
        title="Add Elimination Adjustment Entry"
      >
        <form onSubmit={handleCreateElimination} className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground/90 font-medium mb-1">Elimination Reason / Purpose</label>
            <input
              type="text"
              required
              placeholder="e.g. Eliminate Intercompany Management Fee Inflow & Outflow"
              value={elimForm.reason}
              onChange={(e) => setElimForm({ ...elimForm, reason: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Balanced Elimination Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={elimForm.totalAmount}
              onChange={(e) => setElimForm({ ...elimForm, totalAmount: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Debit Entity</label>
              <select
                value={elimForm.company1Id}
                onChange={(e) => setElimForm({ ...elimForm, company1Id: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Credit Entity</label>
              <select
                value={elimForm.company2Id}
                onChange={(e) => setElimForm({ ...elimForm, company2Id: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsElimModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
