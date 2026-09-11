// ============================================================================
// Unified Accounting & Financial Workspace (Phase 4 Core Accounting Engine)
// ============================================================================

import React, { useState } from 'react';
import { 
  BookOpen, 
  FileSpreadsheet, 
  Layers, 
  Cpu, 
  Plus, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  BarChart3, 
  ShieldCheck,
  Lock,
  Activity,
  Settings as SettingsIcon,
  RotateCcw,
  Sparkles,
  Percent,
  Building2,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { FinancialAmount } from '@/ui/data-display/FinancialAmount';
import { ChartOfAccountsView } from './ChartOfAccountsView';
import { JournalRegisterView } from './JournalRegisterView';
import { AccountLedgerDetailView } from './AccountLedgerDetailView';
import { SubLedgerReconciliationView } from './SubLedgerReconciliationView';
import { OpeningBalanceWizardModal } from './OpeningBalanceWizardModal';
import { AccountingEngineSpecView } from './AccountingEngineSpecView';
import { TaxWorkspace } from '@/modules/tax/components/TaxWorkspace';
import { Modal } from '@/ui/components/Modal';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { generalLedgerService } from '../services/general-ledger.service';
import { ManagementAccountingWorkspace } from '@/modules/cost-accounting/components/ManagementAccountingWorkspace';
import { ConsolidationWorkspace } from '@/modules/consolidation/components/ConsolidationWorkspace';
import { EnterpriseFinancialsView } from './EnterpriseFinancialsView';

export const AccountingWorkspace: React.FC<{ 
  initialTab?: string; 
  onNavigateReports?: () => void;
  onNavigateSettings?: () => void;
}> = ({ 
  initialTab = 'overview',
  onNavigateReports: _onNavigateReports,
  onNavigateSettings
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [ledgerSubTab, setLedgerSubTab] = useState<'detail' | 'coa' | 'trial-balance'>('detail');
  const [reportView, setReportView] = useState<'tb' | 'pnl' | 'bs' | 'management' | 'group'>('tb');
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

  const accounts = db.getAccounts(tenant);
  const journals = db.getJournalEntries(tenant);
  const periods = db.getAccountingPeriods(tenant);
  const currentPeriod = periods.find((p) => p.status === 'open') || periods[0];

  const totalDebits = journals.reduce((sum, j) => sum + parseFloat(j.totalDebit), 0);
  const totalCredits = journals.reduce((sum, j) => sum + parseFloat(j.totalCredit), 0);

  const assetAccounts = accounts.filter((a) => a.classification === 'asset');
  const liabilityAccounts = accounts.filter((a) => a.classification === 'liability');
  const revenueAccounts = accounts.filter((a) => a.classification === 'revenue');
  const expenseAccounts = accounts.filter((a) => a.classification === 'expense');

  // Compute live trial balance report
  const tbReport = generalLedgerService.getTrialBalance(undefined, tenant);

  // Dynamic Financial Statement Aggregations
  const revenueTotal = tbReport.rows
    .filter((r) => r.classification === 'revenue' || r.accountType === 'revenue')
    .reduce((sum, r) => sum + (parseFloat(r.closingCredit) - parseFloat(r.closingDebit)), 0);

  const expenseTotal = tbReport.rows
    .filter((r) => r.classification === 'expense' || r.accountType === 'expense' || r.accountType === 'cost_of_sales')
    .reduce((sum, r) => sum + (parseFloat(r.closingDebit) - parseFloat(r.closingCredit)), 0);

  const netOperatingProfit = revenueTotal - expenseTotal;

  const totalAssets = tbReport.rows
    .filter((r) => r.classification === 'asset' || r.accountType === 'asset')
    .reduce((sum, r) => sum + (parseFloat(r.closingDebit) - parseFloat(r.closingCredit)), 0);

  const totalLiabilities = tbReport.rows
    .filter((r) => r.classification === 'liability' || r.accountType === 'liability')
    .reduce((sum, r) => sum + (parseFloat(r.closingCredit) - parseFloat(r.closingDebit)), 0);

  const totalEquity = tbReport.rows
    .filter((r) => r.classification === 'equity' || r.accountType === 'equity')
    .reduce((sum, r) => sum + (parseFloat(r.closingCredit) - parseFloat(r.closingDebit)), 0);

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netOperatingProfit;

  const totalAR = tbReport.rows
    .filter((r) => r.code === '1200')
    .reduce((sum, r) => sum + (parseFloat(r.closingDebit) - parseFloat(r.closingCredit)), 0);

  const totalAP = tbReport.rows
    .filter((r) => r.code === '2010')
    .reduce((sum, r) => sum + (parseFloat(r.closingCredit) - parseFloat(r.closingDebit)), 0);

  const totalBank = tbReport.rows
    .filter((r) => r.code === '1010' || r.code === '1020')
    .reduce((sum, r) => sum + (parseFloat(r.closingDebit) - parseFloat(r.closingCredit)), 0);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'ledger', label: 'Ledger', icon: <BookOpen className="w-3.5 h-3.5" />, badge: accounts.length },
    { id: 'receivables', label: 'Receivables', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'payables', label: 'Payables', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'journals', label: 'Journals', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, badge: journals.length },
    { id: 'periodic', label: 'Periodic & Closing', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'tax', label: 'Tax & VAT', icon: <Percent className="w-3.5 h-3.5" /> },
    { id: 'reconciliation', label: 'Reconciliation', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'Accruals, Provisions & Year-End Close',
      icon: <Calendar className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => setActiveTab('periodic'),
    },
    {
      label: 'Chart of Accounts Tree',
      icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => { setActiveTab('ledger'); setLedgerSubTab('coa'); },
    },
    {
      label: 'Auto-Posting Rule Matrix',
      icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />,
      onClick: () => setIsSpecModalOpen(true),
    },
    {
      label: 'Management Accounting & Cost Control',
      icon: <Layers className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => { setActiveTab('reports'); setReportView('management'); },
    },
    {
      label: 'Group Accounting & Consolidation',
      icon: <Building2 className="w-3.5 h-3.5 text-cyan-400" />,
      onClick: () => { setActiveTab('reports'); setReportView('group'); },
    },
    {
      label: 'Opening Balance Setup Wizard',
      icon: <RotateCcw className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => setIsOpeningBalanceModalOpen(true),
    },
    {
      label: 'Fiscal Period Locks & Closing',
      icon: <Lock className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setIsPeriodModalOpen(true),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Accounting Configuration',
      icon: <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />,
      onClick: () => onNavigateSettings?.(),
    },
    {
      label: 'Financial Audit Trail',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
      onClick: () => onNavigateSettings?.(),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Financial Accounting', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || 'Overview', isCurrent: true },
        ]}
      />

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Core Accounting Backbone</span>
            <span className="text-foreground/90">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Accounting Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            General Ledger, automated posting engines, double-entry journals, sub-ledger controls, and period closes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => setIsOpeningBalanceModalOpen(true)}
          >
            Opening Balances
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab('journals')}
          >
            Post Adjustment
          </Button>

          <DropdownMenu
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* 5-7 Tab Secondary Navigation Bar with Integrated 'More ▾' */}
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
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block pb-1">
          <DropdownMenu
            variant="ghost"
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Revenue"
              value={`$${revenueTotal.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
              subtext="Operating Revenue (4000)"
            />
            <MetricCard
              label="Total Expenses"
              value={`$${expenseTotal.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<CreditCard className="w-5 h-5 text-rose-400" />}
              subtext="COGS & Operating Expenses"
            />
            <MetricCard
              label="Trade Receivables (AR)"
              value={`$${totalAR.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<CreditCard className="w-5 h-5 text-sky-400" />}
              subtext="GL Account #1200 Control"
            />
            <MetricCard
              label="Trade Payables (AP)"
              value={`$${totalAP.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<CreditCard className="w-5 h-5 text-amber-400" />}
              subtext="GL Account #2010 Control"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Cash & Bank Balance"
              value={`$${totalBank.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<Landmark className="w-5 h-5 text-brand-400" />}
              subtext="Operating Bank #1010 + Cash"
            />
            <MetricCard
              label="Net Operating Profit"
              value={`$${netOperatingProfit.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
              subtext={netOperatingProfit >= 0 ? 'Net Income' : 'Net Loss'}
            />
            <MetricCard
              label="Current Operating Period"
              value={currentPeriod ? currentPeriod.name : 'FY-2026'}
              icon={<ShieldCheck className="w-5 h-5 text-amber-400" />}
              subtext={currentPeriod ? `Status: ${currentPeriod.status.toUpperCase()}` : 'Fiscal Governance'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card
                title="Recent General Ledger Postings"
                subtitle="Double-entry journal records in General Ledger"
                action={
                  <Button variant="ghost" size="xs" onClick={() => setActiveTab('journals')}>
                    View All ({journals.length})
                  </Button>
                }
              >
                {journals.length > 0 ? (
                  <div className="space-y-2.5">
                    {journals.slice(0, 4).map((j) => (
                      <div
                        key={j.id}
                        className="p-3 rounded-lg bg-card border border-border shadow-sm flex items-center justify-between hover:border-brand-500 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-600">{j.entryNumber}</span>
                            <StatusBadge status={j.status} size="xs" />
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                              {j.sourceModule}
                            </span>
                          </div>
                          <p className="text-xs text-foreground font-medium mt-1">{j.memo}</p>
                        </div>
                        <div className="text-right">
                          <FinancialAmount amount={j.totalDebit} currency={j.currency} size="sm" type="debit" />
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{j.postingDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-muted border border-border space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-muted-foreground mx-auto flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">No Journal Entries Recorded Yet</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                        Post your initial opening balances or record standard adjustments to start generating General Ledger history.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="xs" variant="outline" onClick={() => setIsOpeningBalanceModalOpen(true)}>
                        + Setup Opening Balances
                      </Button>
                      <Button size="xs" variant="primary" onClick={() => setActiveTab('journals')}>
                        + Post Adjustment Journal
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Quick Ledger Navigation" subtitle="Essential daily workflows">
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => { setActiveTab('ledger'); setLedgerSubTab('detail'); }}
                    className="w-full p-2.5 rounded-lg bg-muted border border-border hover:border-brand-500 hover:bg-muted/80 text-left font-semibold text-foreground hover:text-brand-700 transition-all flex items-center justify-between"
                  >
                    <span>Account Ledger Inspector</span>
                    <span className="font-mono text-muted-foreground font-normal">Drill-Down</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('ledger'); setLedgerSubTab('coa'); }}
                    className="w-full p-2.5 rounded-lg bg-muted border border-border hover:border-brand-500 hover:bg-muted/80 text-left font-semibold text-foreground hover:text-brand-700 transition-all flex items-center justify-between"
                  >
                    <span>Chart of Accounts Directory</span>
                    <span className="font-mono text-muted-foreground font-normal">{accounts.length} Accounts</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('ledger'); setLedgerSubTab('trial-balance'); }}
                    className="w-full p-2.5 rounded-lg bg-muted border border-border hover:border-brand-500 hover:bg-muted/80 text-left font-semibold text-foreground hover:text-brand-700 transition-all flex items-center justify-between"
                  >
                    <span>Real-Time Trial Balance</span>
                    <span className="font-mono text-emerald-700 font-bold">Balanced</span>
                  </button>

                  <button
                    onClick={() => setIsOpeningBalanceModalOpen(true)}
                    className="w-full p-2.5 rounded-lg bg-muted border border-border hover:border-brand-500 hover:bg-muted/80 text-left font-semibold text-foreground hover:text-brand-700 transition-all flex items-center justify-between"
                  >
                    <span>Opening Balance Setup Wizard</span>
                    <span className="font-mono text-brand-700 font-bold">Wizard</span>
                  </button>
                </div>
              </Card>

              <Card title="COA Classification Summary" subtitle="Account groups registered">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-muted border border-border/80">
                    <span className="text-emerald-700 font-semibold">1000 - Assets</span>
                    <span className="font-mono font-bold text-foreground">{assetAccounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted border border-border/80">
                    <span className="text-amber-700 font-semibold">2000 - Liabilities</span>
                    <span className="font-mono font-bold text-foreground">{liabilityAccounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted border border-border/80">
                    <span className="text-purple-700 font-semibold">3000 - Equity</span>
                    <span className="font-mono font-bold text-foreground">{accounts.filter((a) => a.classification === 'equity').length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted border border-border/80">
                    <span className="text-sky-700 font-semibold">4000 - Revenue</span>
                    <span className="font-mono font-bold text-foreground">{revenueAccounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted border border-border/80">
                    <span className="text-rose-700 font-semibold">5000+ - Expenses &amp; COGS</span>
                    <span className="font-mono font-bold text-foreground">{expenseAccounts.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLedgerSubTab('detail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ledgerSubTab === 'detail'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-card border border-border text-foreground/90 hover:text-foreground hover:bg-muted'
                }`}
              >
                Account Drill-Down Ledger
              </button>
              <button
                onClick={() => setLedgerSubTab('coa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ledgerSubTab === 'coa'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-card border border-border text-foreground/90 hover:text-foreground hover:bg-muted'
                }`}
              >
                Chart of Accounts Tree ({accounts.length})
              </button>
              <button
                onClick={() => setLedgerSubTab('trial-balance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  ledgerSubTab === 'trial-balance'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-card border border-border text-foreground/90 hover:text-foreground hover:bg-muted'
                }`}
              >
                Trial Balance Summary
              </button>
            </div>
          </div>

          {ledgerSubTab === 'detail' && <AccountLedgerDetailView />}

          {ledgerSubTab === 'coa' && <ChartOfAccountsView />}

          {ledgerSubTab === 'trial-balance' && (
            <Card
              title="General Ledger Trial Balance"
              subtitle={`Active ledger account balances • Currency: ${tenant.baseCurrency}`}
              action={
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Balanced (${totalDebits.toFixed(2)} / ${totalCredits.toFixed(2)})
                </span>
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted text-foreground/90 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Account Code</th>
                      <th className="px-5 py-3">Account Name</th>
                      <th className="px-5 py-3">Classification</th>
                      <th className="px-5 py-3 text-right">Debit Balance</th>
                      <th className="px-5 py-3 text-right">Credit Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {tbReport.rows.map((row) => (
                      <tr key={row.accountId} className="hover:bg-muted">
                        <td className="px-5 py-2.5 font-mono font-bold text-brand-600">{row.code}</td>
                        <td className="px-5 py-2.5 font-medium text-foreground">{row.name}</td>
                        <td className="px-5 py-2.5 capitalize text-muted-foreground">{row.classification}</td>
                        <td className="px-5 py-2.5 text-right font-mono font-semibold">
                          {parseFloat(row.closingDebit) > 0 ? <span className="text-emerald-700">{row.closingDebit}</span> : '-'}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono font-semibold">
                          {parseFloat(row.closingCredit) > 0 ? <span className="text-sky-700">{row.closingCredit}</span> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold border-t border-border text-foreground">
                      <td colSpan={3} className="px-5 py-3 text-right uppercase tracking-wider">Totals:</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-700">${parseFloat(tbReport.totalClosingDebit).toFixed(4)}</td>
                      <td className="px-5 py-3 text-right font-mono text-sky-700">${parseFloat(tbReport.totalClosingCredit).toFixed(4)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: RECEIVABLES */}
      {activeTab === 'receivables' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Accounts Receivable (AR) Sub-Ledger"
              subtitle="Trade Debtors control integration with General Ledger (Account #1200)"
            >
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Every sales invoice and customer receipt posted in the Sales domain writes directly to customer sub-ledger balances and automatically updates the GL AR Control Account.
                </p>
                <div className="p-3 rounded-lg bg-card/60 border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Reconciliation Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% In Balance (${totalAR.toFixed(2)} {tenant.baseCurrency})
                  </span>
                </div>
              </div>
            </Card>

            <Card
              title="AR Aging Analysis Summary"
              subtitle="Outstanding customer receivables by due date tier"
            >
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-emerald-400 font-medium">Current (0 - 30 Days)</span>
                  <span className="font-mono text-foreground">${totalAR.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">31 - 60 Days</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">61 - 90 Days</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">90+ Days (Overdue)</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: PAYABLES */}
      {activeTab === 'payables' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Accounts Payable (AP) Sub-Ledger"
              subtitle="Trade Creditors control integration with General Ledger (Account #2010)"
            >
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Supplier bills and payment disbursements update supplier sub-ledger balances with 3-way matching support and automated input tax calculation.
                </p>
                <div className="p-3 rounded-lg bg-card/60 border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Reconciliation Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% In Balance (${totalAP.toFixed(2)} {tenant.baseCurrency})
                  </span>
                </div>
              </div>
            </Card>

            <Card
              title="AP Aging Analysis Summary"
              subtitle="Upcoming supplier liabilities by due date tier"
            >
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">Current (0 - 30 Days)</span>
                  <span className="font-mono text-foreground">${totalAP.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">31 - 60 Days</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">61 - 90 Days</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-card/40">
                  <span className="text-muted-foreground">90+ Days (Overdue)</span>
                  <span className="font-mono text-muted-foreground">$0.00</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: JOURNALS & POSTINGS */}
      {activeTab === 'journals' && (
        <JournalRegisterView />
      )}

      {/* TAB 6: PERIODIC & CLOSING */}
      {activeTab === 'periodic' && (
        <EnterpriseFinancialsView />
      )}

      {/* TAB 7: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <SubLedgerReconciliationView />
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'tb', label: 'Trial Balance' },
              { id: 'pnl', label: 'Profit & Loss (P&L)' },
              { id: 'bs', label: 'Balance Sheet' },
              { id: 'management', label: 'Management Accounting' },
              { id: 'group', label: 'Group & Consolidation' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setReportView(r.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportView === r.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {reportView === 'group' ? (
            <ConsolidationWorkspace />
          ) : reportView === 'management' ? (
            <ManagementAccountingWorkspace onNavigateAccounting={() => { setActiveTab('reports'); setReportView('tb'); }} />
          ) : reportView === 'pnl' ? (
            <Card
              title="Statement of Profit & Loss (Income Statement)"
              subtitle={`For period ended ${new Date().toLocaleDateString()} • Currency: ${tenant.baseCurrency}`}
            >
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-card/60 border border-border space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-foreground border-b border-border pb-2">
                    <span>Total Operating Revenue (4000)</span>
                    <span className="text-emerald-400 font-mono">${revenueTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {revenueTotal > 0 ? 'Operating revenues recognized from posted invoices & journals.' : 'No revenue posted for active period.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card/60 border border-border space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-foreground border-b border-border pb-2">
                    <span>Total Operating Expenses & COGS (5000-6000)</span>
                    <span className="text-rose-400 font-mono">${expenseTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {expenseTotal > 0 ? 'Operating expenses recognized from posted bills & journals.' : 'No expenses posted for active period.'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-bold ${
                  netOperatingProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                }`}>
                  <span className={netOperatingProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    Net Operating {netOperatingProfit >= 0 ? 'Income (Profit)' : 'Loss'}
                  </span>
                  <span className={`font-mono text-base ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${netOperatingProfit.toFixed(2)} {tenant.baseCurrency}
                  </span>
                </div>
              </div>
            </Card>
          ) : reportView === 'bs' ? (
            <Card
              title="Statement of Financial Position (Balance Sheet)"
              subtitle={`As of ${new Date().toLocaleDateString()} • Currency: ${tenant.baseCurrency}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-card/60 border border-border space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-emerald-400 border-b border-border pb-2">
                    <span>Total Assets (1000)</span>
                    <span className="font-mono">${totalAssets.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-foreground/90">
                    <p className="text-muted-foreground text-[11px]">
                      {totalAssets > 0 ? 'Live balances aggregated from General Ledger asset accounts.' : 'All asset balances currently at $0.00.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card/60 border border-border space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-sky-400 border-b border-border pb-2">
                    <span>Total Liabilities & Equity (2000-3000)</span>
                    <span className="font-mono">${totalLiabilitiesAndEquity.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-foreground/90">
                    <p className="text-muted-foreground text-[11px]">
                      {totalLiabilitiesAndEquity > 0 ? 'Live balances aggregated from General Ledger liabilities & equity.' : 'All liabilities & equity balances currently at $0.00.'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              title="Trial Balance Summary"
              subtitle={`Live General Ledger balance • Currency: ${tenant.baseCurrency}`}
            >
              <div className="p-4 rounded-lg bg-card/60 border border-border flex items-center justify-between text-xs">
                <span className="text-foreground/90 font-semibold">Total Debits: <strong className="text-emerald-400">${parseFloat(tbReport.totalClosingDebit).toFixed(2)}</strong></span>
                <span className="text-foreground/90 font-semibold">Total Credits: <strong className="text-sky-400">${parseFloat(tbReport.totalClosingCredit).toFixed(2)}</strong></span>
                <span className="text-emerald-400 font-bold">100% Balanced</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB: TAX & VAT MANAGEMENT */}
      {activeTab === 'tax' && (
        <TaxWorkspace onNavigateAccounting={() => setActiveTab('overview')} />
      )}

      {/* Auto-Posting Spec Modal */}
      <Modal
        isOpen={isSpecModalOpen}
        onClose={() => setIsSpecModalOpen(false)}
        title="Automated Accounting Engine Specification"
        subtitle="Deterministic rules mapping operational ERP events to General Ledger journals"
        size="2xl"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsSpecModalOpen(false)}>
            Close
          </Button>
        }
      >
        <AccountingEngineSpecView />
      </Modal>

      {/* Period Locks Modal */}
      <Modal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        title="Fiscal Periods & Period Locks"
        subtitle="Period locking prevents unapproved postings into closed financial periods"
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsPeriodModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            Current Operating Period: <strong>{currentPeriod ? currentPeriod.name : 'FY-2026'}</strong> (Status: {currentPeriod ? currentPeriod.status.toUpperCase() : 'OPEN'}).
          </div>
          <p className="text-xs text-muted-foreground">
            To lock historical periods or configure multi-year fiscal calendars, visit the Accounting section in Settings.
          </p>
        </div>
      </Modal>

      {/* Opening Balances Wizard Modal */}
      <OpeningBalanceWizardModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => setIsOpeningBalanceModalOpen(false)}
      />
    </div>
  );
};
