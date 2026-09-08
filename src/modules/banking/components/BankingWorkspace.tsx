// ============================================================================
// Banking & Treasury Master Workspace (Phase 8 Enterprise Implementation)
// ============================================================================

import React, { useState } from 'react';
import { 
  Landmark, 
  CreditCard, 
  ArrowLeftRight, 
  CheckCircle2, 
  FileText, 
  FileCheck, 
  Coins, 
  Wallet, 
  Scale, 
  TrendingUp, 
  FileUp 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { BankAccountDirectoryView } from './BankAccountDirectoryView';
import { CashAccountsView } from './CashAccountsView';
import { BankTransactionsView } from './BankTransactionsView';
import { BankTransfersView } from './BankTransfersView';
import { BankReconciliationView } from './BankReconciliationView';
import { CashPositionView } from './CashPositionView';
import { ChequeRegisterView } from './ChequeRegisterView';
import { BankStatementImportModal } from './BankStatementImportModal';
import { SubLedgerReconciliationView } from '@/modules/accounting/components/SubLedgerReconciliationView';

export const BankingWorkspace: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const bankAccounts = db.getBankAccounts(tenant);
  const cashAccounts = db.getCashAccounts(tenant);
  const transactions = db.getBankTransactions(undefined, tenant);
  const unreconciledTx = transactions.filter((t) => t.reconciliationStatus === 'unreconciled');
  const transfers = db.getBankTransfers(tenant);

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + parseFloat(b.currentBalance), 0);
  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);
  const totalLiquid = totalBankBalance + totalCashBalance;

  // Open AR & AP amounts
  const openInvoices = db.getSalesInvoices(tenant).filter((i) => i.status === 'posted');
  const expectedAR = openInvoices.reduce((sum, i) => sum + parseFloat(i.balanceDue), 0);

  const openBills = db.getSupplierBills(tenant).filter((b) => b.status === 'posted');
  const expectedAP = openBills.reduce((sum, b) => sum + parseFloat(b.balanceDue), 0);

  const netCashPosition = totalLiquid + expectedAR - expectedAP;

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: <CreditCard className="w-3.5 h-3.5" />, badge: bankAccounts.length },
    { id: 'cash-accounts', label: 'Cash Accounts', icon: <Coins className="w-3.5 h-3.5" />, badge: cashAccounts.length },
    { id: 'transactions', label: 'Transactions', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'transfers', label: 'Transfers', icon: <ArrowLeftRight className="w-3.5 h-3.5" />, badge: transfers.length },
    { id: 'reconciliation', label: 'Reconciliation', icon: <CheckCircle2 className="w-3.5 h-3.5" />, badge: unreconciledTx.length > 0 ? unreconciledTx.length : undefined },
  ];

  const moreMenuItems = [
    {
      label: 'Treasury Cash Position & Forecast',
      icon: <Wallet className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => setActiveTab('cash-position'),
    },
    {
      label: 'Cheque & PDC Register',
      icon: <FileCheck className="w-3.5 h-3.5 text-purple-400" />,
      onClick: () => setActiveTab('cheques'),
    },
    {
      label: 'Import Electronic Bank Statement',
      icon: <FileUp className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => setIsImportModalOpen(true),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Bank Sub-Ledger vs GL #1010 Reconciliation',
      icon: <Scale className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setActiveTab('sub-ledger-reconciliation'),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Banking & Treasury', onClick: () => setActiveTab('overview') },
          { 
            label: 
              primaryTabs.find((t) => t.id === activeTab)?.label ||
              (activeTab === 'cash-position' ? 'Cash Position' : activeTab === 'cheques' ? 'Cheque Register' : 'Reconciliation'), 
            isCurrent: true 
          },
        ]}
      />

      {/* Workspace Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-brand-600" />
            Banking & Cash Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Commercial bank accounts, cash drawers, transfers, automated statement matching, and multi-currency liquidity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeftRight className="w-3.5 h-3.5 text-brand-600" />}
            onClick={() => setActiveTab('transfers')}
          >
            Transfer Funds
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FileUp className="w-3.5 h-3.5" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Statement
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <DropdownMenu items={moreMenuItems} label="More ▾" />
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <MetricCard
              label="Total Liquid Bank Funds"
              value={`$${totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<Landmark className="w-4 h-4 text-brand-400" />}
              subtext={`${bankAccounts.length} Active Accounts`}
            />
            <MetricCard
              label="Physical Vault & Petty Cash"
              value={`$${totalCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<Coins className="w-4 h-4 text-amber-400" />}
              subtext={`${cashAccounts.length} Cash Drawers`}
            />
            <MetricCard
              label="Unreconciled Transactions"
              value={unreconciledTx.length.toString()}
              icon={<Scale className="w-4 h-4 text-rose-400" />}
              subtext={unreconciledTx.length > 0 ? "Reconciliation Pending" : "Fully Balanced"}
            />
            <MetricCard
              label="Net Forecasted Position"
              value={`$${netCashPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
              subtext="Liquid + AR - AP"
            />
          </div>

          {/* Bank Accounts Summary Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-600" />
                  Primary Bank Accounts
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('bank-accounts')}
                  className="text-xs text-brand-600 font-semibold"
                >
                  View All ({bankAccounts.length})
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bankAccounts.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setActiveTab('bank-accounts')}
                    className="p-3.5 rounded-xl bg-white/90 border border-slate-200 hover:border-brand-500 shadow-sm cursor-pointer space-y-2 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{b.accountName}</div>
                        <div className="text-[11px] text-slate-600">{b.bankName}</div>
                      </div>
                      <StatusBadge status={b.isActive ? 'active' : 'inactive'} />
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                      <span className="text-[10px] text-slate-500 font-mono">••••••••{b.accountNumber.slice(-4)}</span>
                      <span className="text-sm font-bold font-mono text-emerald-600">
                        ${parseFloat(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Reconcile Card */}
            <div className="space-y-3">
              <Card title="Treasury Quick Actions">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs text-slate-800"
                    icon={<ArrowLeftRight className="w-3.5 h-3.5 text-brand-600" />}
                    onClick={() => setActiveTab('transfers')}
                  >
                    Inter-Bank Transfer Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs text-slate-800"
                    icon={<Scale className="w-3.5 h-3.5 text-amber-600" />}
                    onClick={() => setActiveTab('reconciliation')}
                  >
                    Bank Statement Reconciliation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs text-slate-800"
                    icon={<Wallet className="w-3.5 h-3.5 text-emerald-600" />}
                    onClick={() => setActiveTab('cash-position')}
                  >
                    Liquidity &amp; Cash Forecast
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs text-slate-800"
                    icon={<FileCheck className="w-3.5 h-3.5 text-purple-600" />}
                    onClick={() => setActiveTab('cheques')}
                  >
                    Post-Dated Cheque (PDC) Vault
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Recent Bank Transactions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Recent Financial Movements
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('transactions')}
              >
                View Full Ledger ({transactions.length})
              </Button>
            </div>

            <Card noPadding>
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No bank or cash movements recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Reference #</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-slate-900/20 font-mono text-[11px]">
                      {transactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="p-2.5 text-slate-400">{tx.transactionDate}</td>
                          <td className="p-2.5 font-bold text-brand-400">{tx.reference || tx.transactionNumber}</td>
                          <td className="p-2.5 font-sans text-slate-200 truncate max-w-xs">{tx.description}</td>
                          <td className="p-2.5 uppercase text-[10px] text-slate-400">{tx.transactionType.replace('_', ' ')}</td>
                          <td className={`p-2.5 text-right font-bold ${
                            tx.debitCredit === 'debit' ? 'text-emerald-400' : 'text-slate-200'
                          }`}>
                            {tx.debitCredit === 'debit' ? `+$${parseFloat(tx.amount).toFixed(2)}` : `-$${parseFloat(tx.amount).toFixed(2)}`}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              tx.reconciliationStatus === 'reconciled'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {tx.reconciliationStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: BANK ACCOUNTS */}
      {activeTab === 'bank-accounts' && <BankAccountDirectoryView />}

      {/* TAB 3: CASH ACCOUNTS */}
      {activeTab === 'cash-accounts' && <CashAccountsView />}

      {/* TAB 4: TRANSACTIONS */}
      {activeTab === 'transactions' && <BankTransactionsView />}

      {/* TAB 5: TRANSFERS */}
      {activeTab === 'transfers' && <BankTransfersView />}

      {/* TAB 6: RECONCILIATION */}
      {activeTab === 'reconciliation' && <BankReconciliationView />}

      {/* TAB 7: CASH POSITION */}
      {activeTab === 'cash-position' && <CashPositionView />}

      {/* TAB 8: CHEQUES */}
      {activeTab === 'cheques' && <ChequeRegisterView />}

      {/* TAB 9: SUB-LEDGER RECONCILIATION */}
      {activeTab === 'sub-ledger-reconciliation' && (
        <SubLedgerReconciliationView />
      )}

      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => setActiveTab('reconciliation')}
      />
    </div>
  );
};
