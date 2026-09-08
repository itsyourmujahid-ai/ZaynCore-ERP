// ============================================================================
// Bank Reconciliation Workbench Component
// Side-by-side statement vs ERP matching, metrics summary, difference resolution
// ============================================================================

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  FileUp, 
  Zap, 
  Link, 
  Unlink, 
  Scale
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankReconciliationService } from '@/modules/banking/services/bank-reconciliation.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { BankStatementImportModal } from './BankStatementImportModal';

export const BankReconciliationView: React.FC = () => {
  const { tenant } = useAuth();
  const bankAccounts = db.getBankAccounts(tenant);

  const [selectedAccountId, setSelectedAccountId] = useState(bankAccounts[0]?.id || '');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStatementLineId, setSelectedStatementLineId] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const currentBank = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0];
  const statements = currentBank ? db.getBankStatements(currentBank.id, tenant) : [];
  const latestStatement = statements[statements.length - 1];

  const statementLines = latestStatement ? db.getBankStatementLines(latestStatement.id, tenant) : [];
  const erpTransactions = currentBank
    ? db.getBankTransactions(currentBank.id, tenant).filter((t) => t.status === 'posted')
    : [];

  const reconciliations = currentBank ? db.getBankReconciliations(currentBank.id, tenant) : [];
  const activeSession = reconciliations.find((r) => r.status === 'in_progress' || r.status === 'balanced') || reconciliations[0];

  // Auto-initiate session if needed
  const handleStartSession = () => {
    if (!currentBank || !latestStatement) return;
    bankReconciliationService.createReconciliationSession({
      bankAccountId: currentBank.id,
      statementId: latestStatement.id,
      asOfDate: latestStatement.endDate,
      statementEndingBalance: latestStatement.closingBalance,
    }, tenant);
  };

  const handleAutoMatch = () => {
    if (!latestStatement) return;
    bankReconciliationService.runAutoMatchRules(latestStatement.id, tenant);
    if (activeSession) {
      bankReconciliationService.recalculateReconciliationMetrics(activeSession.id, tenant);
    }
  };

  const handleManualMatch = () => {
    if (!selectedStatementLineId || !selectedTxId) return;
    try {
      bankReconciliationService.manualMatchLines(selectedStatementLineId, selectedTxId, tenant);
      if (activeSession) {
        bankReconciliationService.recalculateReconciliationMetrics(activeSession.id, tenant);
      }
      setSelectedStatementLineId(null);
      setSelectedTxId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to match items.');
    }
  };

  const handleUnmatch = (lineId: string) => {
    bankReconciliationService.unmatchLine(lineId, tenant);
    if (activeSession) {
      bankReconciliationService.recalculateReconciliationMetrics(activeSession.id, tenant);
    }
  };

  const handleCreateAdjustment = (lineId: string, type: 'bank_charge' | 'interest') => {
    if (!activeSession) return;
    try {
      bankReconciliationService.createReconciliationAdjustment(
        activeSession.id,
        lineId,
        type,
        undefined,
        tenant
      );
    } catch (err: any) {
      alert(err.message || 'Failed to create adjustment.');
    }
  };

  const handleCompleteReconciliation = () => {
    if (!activeSession) return;
    try {
      bankReconciliationService.completeReconciliation(activeSession.id, tenant);
      alert('Reconciliation successfully finalized and locked.');
    } catch (err: any) {
      alert(err.message || 'Cannot complete reconciliation.');
    }
  };

  // Metrics
  const stmtEnd = latestStatement ? parseFloat(latestStatement.closingBalance) : 0;
  const erpEnd = currentBank ? parseFloat(currentBank.currentBalance) : 0;
  const variance = activeSession ? parseFloat(activeSession.variance) : (erpEnd - stmtEnd);
  const isBalanced = Math.abs(variance) < 0.0001;

  return (
    <div className="space-y-4">
      {/* Account Selector & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-brand-500"
          >
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.accountName} ({b.bankName})
              </option>
            ))}
          </select>

          {latestStatement && !activeSession && (
            <Button
              variant="outline"
              size="sm"
              icon={<Scale className="w-3.5 h-3.5 text-brand-400" />}
              onClick={handleStartSession}
            >
              Start Session
            </Button>
          )}

          {latestStatement && (
            <Button
              variant="outline"
              size="sm"
              icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
              onClick={handleAutoMatch}
            >
              Auto-Match
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileUp className="w-3.5 h-3.5 text-brand-400" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import Statement
          </Button>

          {activeSession && activeSession.status !== 'completed' && (
            <Button
              variant="primary"
              size="sm"
              disabled={!isBalanced}
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleCompleteReconciliation}
            >
              Lock & Complete
            </Button>
          )}
        </div>
      </div>

      {/* Reconciliation Summary Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Statement Ending Balance</div>
          <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
            ${stmtEnd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{latestStatement ? latestStatement.statementNumber : 'No statement'}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">ERP Book Balance</div>
          <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
            ${erpEnd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">GL Account: #1010</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Receipts (+)</div>
          <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
            +${parseFloat(activeSession?.outstandingReceiptsTotal || '0.00').toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">In-transit deposits</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Payments (-)</div>
          <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
            -${parseFloat(activeSession?.outstandingPaymentsTotal || '0.00').toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Uncleared disbursements</div>
        </div>

        <div className={`p-3 rounded-xl border ${
          isBalanced
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="text-[10px] uppercase font-bold text-slate-300">Variance / Difference</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${
            isBalanced ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            ${Math.abs(variance).toFixed(2)}
          </div>
          <div className={`text-[10px] font-bold uppercase ${
            isBalanced ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isBalanced ? '✓ Reconciled & Balanced' : 'Difference Exists'}
          </div>
        </div>
      </div>

      {/* Manual Match Trigger Bar */}
      {selectedStatementLineId && selectedTxId && (
        <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between">
          <div className="text-xs text-brand-300 flex items-center gap-2">
            <Link className="w-4 h-4 text-brand-400" />
            <span>Ready to link selected statement line to ERP transaction.</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleManualMatch}
          >
            Confirm Match
          </Button>
        </div>
      )}

      {/* Side-by-Side Matching Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Bank Statement Lines */}
        <Card
          title="Bank Statement Lines"
          subtitle={latestStatement ? `Imported: ${latestStatement.statementNumber}` : 'Upload statement to start'}
        >
          {statementLines.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileUp className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No statement lines uploaded for this bank account.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
              >
                Upload Statement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Description / Ref</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30 font-mono text-[11px]">
                  {statementLines.map((l) => {
                    const isSelected = selectedStatementLineId === l.id;
                    const isMatched = l.matchStatus === 'matched';

                    return (
                      <tr
                        key={l.id}
                        onClick={() => !isMatched && setSelectedStatementLineId(isSelected ? null : l.id)}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-brand-500/20 ring-1 ring-brand-500'
                            : isMatched
                            ? 'bg-emerald-500/5'
                            : 'hover:bg-slate-800/40 cursor-pointer'
                        }`}
                      >
                        <td className="p-2.5 text-slate-400">{l.lineDate}</td>
                        <td className="p-2.5 font-sans">
                          <div className="text-slate-100 font-medium truncate max-w-[140px]">{l.description}</div>
                          {l.reference && <div className="text-[10px] text-slate-500">{l.reference}</div>}
                        </td>
                        <td className={`p-2.5 text-right font-bold ${
                          l.debitCredit === 'debit' ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {l.debitCredit === 'debit' ? `+$${l.amount}` : `-$${l.amount}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isMatched
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {l.matchStatus}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          {isMatched ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnmatch(l.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Unmatch line"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateAdjustment(l.id, 'bank_charge');
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-sans"
                                title="Record as bank charge"
                              >
                                Fee
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateAdjustment(l.id, 'interest');
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-sans"
                                title="Record as interest"
                              >
                                Int
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right Side: ERP Bank Transactions */}
        <Card
          title="ERP Bank Ledger Transactions"
          subtitle="Customer receipts, supplier payments, transfers & journals"
        >
          {erpTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No transactions recorded in ERP for this bank account.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Tx Ref / Memo</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30 font-mono text-[11px]">
                  {erpTransactions.map((tx) => {
                    const isSelected = selectedTxId === tx.id;
                    const isMatched = tx.reconciliationStatus === 'matched' || tx.reconciliationStatus === 'reconciled';

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => !isMatched && setSelectedTxId(isSelected ? null : tx.id)}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-brand-500/20 ring-1 ring-brand-500'
                            : isMatched
                            ? 'bg-emerald-500/5'
                            : 'hover:bg-slate-800/40 cursor-pointer'
                        }`}
                      >
                        <td className="p-2.5 text-slate-400">{tx.transactionDate}</td>
                        <td className="p-2.5 font-sans">
                          <div className="text-slate-100 font-bold truncate max-w-[140px]">
                            {tx.reference || tx.transactionNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{tx.description}</div>
                        </td>
                        <td className={`p-2.5 text-right font-bold ${
                          tx.debitCredit === 'debit' ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {tx.debitCredit === 'debit' ? `+$${tx.amount}` : `-$${tx.amount}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isMatched
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {tx.reconciliationStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => {
          if (activeSession) {
            bankReconciliationService.recalculateReconciliationMetrics(activeSession.id, tenant);
          }
        }}
      />
    </div>
  );
};
