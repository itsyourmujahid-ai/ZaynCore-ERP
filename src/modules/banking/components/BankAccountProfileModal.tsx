// ============================================================================
// Bank & Cash Account 360-Degree Profile & Ledger Inspection Modal
// ============================================================================

import React, { useState } from 'react';
import { 
  Landmark, 
  CreditCard, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankingService } from '@/modules/banking/services/banking.service';
import { Modal } from '@/ui/components/Modal';
import { Card } from '@/ui/components/Card';
import { StatusBadge } from '@/ui/data-display/StatusBadge';

interface BankAccountProfileModalProps {
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BankAccountProfileModal: React.FC<BankAccountProfileModalProps> = ({
  accountId,
  isOpen,
  onClose,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'transfers' | 'statements' | 'reconciliations'>('overview');

  if (!accountId || !isOpen) return null;

  const bank = db.getBankAccountById(accountId, tenant);
  const cash = !bank ? db.getCashAccountById(accountId, tenant) : null;
  const account = bank || cash;

  if (!account) return null;

  const isBank = !!bank;
  const glAccount = db.getAccounts(tenant).find((a) => a.id === account.glAccountId);
  const statementData = bankingService.getAccountStatement(account.id, undefined, undefined, tenant);
  const transfers = db.getBankTransfers(tenant).filter(
    (t) => t.fromBankAccountId === account.id || t.toBankAccountId === account.id
  );
  const reconciliations = isBank ? db.getBankReconciliations(account.id, tenant) : [];
  const statements = isBank ? db.getBankStatements(account.id, tenant) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${account.accountName} (${account.currency})`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Header Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card/80 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              {isBank ? <Landmark className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{account.accountName}</span>
                <StatusBadge status={account.isActive ? 'active' : 'inactive'} />
                {account.isDefault && (
                  <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-bold uppercase">
                    Primary Default
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{isBank ? bank?.bankName : `Cash Drawer (${cash?.cashAccountType})`}</span>
                <span>•</span>
                <span className="font-mono text-foreground/90">GL: {glAccount?.code} - {glAccount?.name}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Book Balance</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${parseFloat(account.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted-foreground">Currency: {account.currency}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview & Controls
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'ledger'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transaction Ledger ({statementData.transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'transfers'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transfers ({transfers.length})
          </button>
          {isBank && (
            <>
              <button
                onClick={() => setActiveTab('statements')}
                className={`px-3 py-2 border-b-2 font-medium transition-all ${
                  activeTab === 'statements'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Imported Statements ({statements.length})
              </button>
              <button
                onClick={() => setActiveTab('reconciliations')}
                className={`px-3 py-2 border-b-2 font-medium transition-all ${
                  activeTab === 'reconciliations'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Reconciliations ({reconciliations.length})
              </button>
            </>
          )}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Banking Details & Identifiers">
              <dl className="divide-y divide-border text-xs">
                {isBank ? (
                  <>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Account Number (Masked)</dt>
                      <dd className="font-mono font-bold text-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        {bankingService.getMaskedAccountNumber(bank?.accountNumber || '')}
                      </dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Bank Name</dt>
                      <dd className="font-medium text-foreground">{bank?.bankName}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Branch Office</dt>
                      <dd className="text-foreground/90">{bank?.branch || 'Headquarters'}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">IBAN</dt>
                      <dd className="font-mono text-foreground/90">{bank?.iban || 'N/A'}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">SWIFT / BIC Code</dt>
                      <dd className="font-mono text-foreground/90">{bank?.swiftBic || 'N/A'}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Account Type</dt>
                      <dd className="capitalize text-foreground/90">{bank?.accountType} Account</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Drawer Type</dt>
                      <dd className="capitalize text-foreground">{cash?.cashAccountType.replace('_', ' ')}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Assigned Custodian</dt>
                      <dd className="font-medium text-foreground">{cash?.custodianName || 'Unassigned'}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-muted-foreground">Maximum Limit</dt>
                      <dd className="font-mono text-foreground/90">${cash?.maxLimit || 'Unlimited'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </Card>

            <Card title="Accounting & Balance Setup">
              <dl className="divide-y divide-border text-xs">
                <div className="py-2 flex justify-between">
                  <dt className="text-muted-foreground">GL Control Account</dt>
                  <dd className="font-mono font-bold text-brand-400">
                    {glAccount?.code} ({glAccount?.name})
                  </dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-muted-foreground">Base Currency</dt>
                  <dd className="font-bold text-foreground">{account.currency}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-muted-foreground">Opening Balance</dt>
                  <dd className="font-mono font-medium text-foreground">${account.openingBalance}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-muted-foreground">Opening Balance Date</dt>
                  <dd className="font-mono text-foreground/90">{account.openingBalanceDate}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-muted-foreground">Sub-Ledger Tagging</dt>
                  <dd className="text-emerald-400 font-medium">Automatic Sub-Ledger Control</dd>
                </div>
              </dl>

              {account.notes && (
                <div className="mt-3 p-2.5 rounded bg-card border border-border text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground/90">Notes:</span> {account.notes}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 2: Transaction Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Chronological Bank Movements</span>
              <div className="flex gap-4 font-mono">
                <span className="text-emerald-400 font-bold">Total Inflows: +${statementData.totalDebits}</span>
                <span className="text-rose-400 font-bold">Total Outflows: -${statementData.totalCredits}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-card text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Ref / Tx #</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5 text-right">Inflow (+)</th>
                    <th className="p-2.5 text-right">Outflow (-)</th>
                    <th className="p-2.5 text-right font-bold">Running Balance</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card/30 font-mono text-[11px]">
                  {statementData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-sans">
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    statementData.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="p-2.5 text-muted-foreground">{t.transactionDate}</td>
                        <td className="p-2.5 font-bold text-brand-400">{t.reference || t.transactionNumber}</td>
                        <td className="p-2.5 font-sans text-foreground truncate max-w-xs">{t.description}</td>
                        <td className="p-2.5 uppercase text-[10px] text-muted-foreground">{t.transactionType.replace('_', ' ')}</td>
                        <td className="p-2.5 text-right text-emerald-400 font-semibold">
                          {t.debitCredit === 'debit' ? `+$${t.amount}` : '-'}
                        </td>
                        <td className="p-2.5 text-right text-rose-400 font-semibold">
                          {t.debitCredit === 'credit' ? `-$${t.amount}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">${t.runningBalance}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            t.reconciliationStatus === 'reconciled'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {t.reconciliationStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Transfers */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-card text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2.5">Transfer #</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Direction</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5 text-right">Fee</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card/30 font-mono text-[11px]">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                      No transfers initiated for this account.
                    </td>
                  </tr>
                ) : (
                  transfers.map((trf) => {
                    const isOutflow = trf.fromBankAccountId === account.id;
                    return (
                      <tr key={trf.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-bold text-brand-400">{trf.transferNumber}</td>
                        <td className="p-2.5 text-muted-foreground">{trf.transferDate}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isOutflow ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {isOutflow ? 'Outflow (Sent)' : 'Inflow (Received)'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">${trf.amount}</td>
                        <td className="p-2.5 text-right text-muted-foreground">${trf.feeAmount || '0.00'}</td>
                        <td className="p-2.5 text-center">
                          <StatusBadge status={trf.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Statements */}
        {activeTab === 'statements' && isBank && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-card text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2.5">Statement #</th>
                  <th className="p-2.5">Date Range</th>
                  <th className="p-2.5 text-right">Opening Balance</th>
                  <th className="p-2.5 text-right">Closing Balance</th>
                  <th className="p-2.5 text-right">Lines</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card/30 font-mono text-[11px]">
                {statements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                      No electronic statements uploaded yet.
                    </td>
                  </tr>
                ) : (
                  statements.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="p-2.5 font-bold text-brand-400">{s.statementNumber}</td>
                      <td className="p-2.5 text-foreground/90">{s.startDate} to {s.endDate}</td>
                      <td className="p-2.5 text-right text-foreground/90">${s.openingBalance}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">${s.closingBalance}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{s.totalLinesCount}</td>
                      <td className="p-2.5 text-center">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Reconciliations */}
        {activeTab === 'reconciliations' && isBank && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-card text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-2.5">Reconciliation #</th>
                  <th className="p-2.5">As Of Date</th>
                  <th className="p-2.5 text-right">Statement Balance</th>
                  <th className="p-2.5 text-right">ERP Book Balance</th>
                  <th className="p-2.5 text-right">Variance</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card/30 font-mono text-[11px]">
                {reconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                      No completed reconciliations for this bank account.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="p-2.5 font-bold text-brand-400">{r.reconciliationNumber}</td>
                      <td className="p-2.5 text-foreground/90">{r.asOfDate}</td>
                      <td className="p-2.5 text-right text-foreground">${r.statementEndingBalance}</td>
                      <td className="p-2.5 text-right text-foreground">${r.erpEndingBalance}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">${r.variance}</td>
                      <td className="p-2.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
