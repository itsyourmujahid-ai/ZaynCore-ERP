// ============================================================================
// Opening Balance Setup Wizard Modal (Balanced Double-Entry)
// ============================================================================

import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { Select } from '@/ui/components/Select';
import { Input } from '@/ui/components/Input';
import { areDebitsAndCreditsBalanced, createMoney } from '@/core/utils/money';

export interface OpeningBalanceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OpeningBalanceWizardModal: React.FC<OpeningBalanceWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { tenant } = useAuth();
  const accounts = db.getAccounts(tenant);
  const periods = db.getAccountingPeriods(tenant);
  const openPeriods = periods.filter((p) => p.status === 'open');

  const [selectedPeriodId, setSelectedPeriodId] = useState(openPeriods[0]?.id || '');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('Fiscal Year Opening Balances Confirmation');
  const [lines, setLines] = useState<Array<{
    accountId: string;
    description: string;
    debitAmount: string;
    creditAmount: string;
  }>>([
    { accountId: accounts[0]?.id || '', description: 'Initial Bank Opening Balance', debitAmount: '100000.0000', creditAmount: '0.0000' },
    { accountId: accounts.find((a) => a.code === '3010')?.id || accounts[1]?.id || '', description: 'Paid-In Share Capital', debitAmount: '0.0000', creditAmount: '100000.0000' },
  ]);

  const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debitAmount || '0'), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.creditAmount || '0'), 0);
  const isBalanced = areDebitsAndCreditsBalanced(
    createMoney(totalDebit.toFixed(4), tenant.baseCurrency),
    createMoney(totalCredit.toFixed(4), tenant.baseCurrency)
  );

  const handleAddLine = () => {
    setLines([
      ...lines,
      { accountId: accounts[0]?.id || '', description: 'Opening Balance Line', debitAmount: '0.0000', creditAmount: '0.0000' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      alert('An opening balance journal requires at least two lines for double-entry.');
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Cannot post unbalanced opening balances. Total Debits must equal Total Credits.');
      return;
    }

    try {
      db.postJournalEntry({
        companyId: tenant.companyId,
        branchId: tenant.branchId,
        periodId: selectedPeriodId || openPeriods[0]?.id || '',
        entryNumber: `JV-OPEN-${new Date().getFullYear()}`,
        entryDate: openingDate,
        postingDate: openingDate,
        sourceModule: 'opening_balance',
        sourceType: 'opening_balance',
        sourceId: 'INITIAL-OPENING',
        postingEvent: 'OPENING_BALANCE_POSTED',
        memo: memo || 'Opening Balance Confirmation',
        totalDebit: totalDebit.toFixed(4),
        totalCredit: totalCredit.toFixed(4),
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        status: 'posted',
        lines: lines.map((l, i) => ({
          accountId: l.accountId,
          lineNumber: i + 1,
          description: l.description,
          debitAmount: parseFloat(l.debitAmount || '0').toFixed(4),
          creditAmount: parseFloat(l.creditAmount || '0').toFixed(4),
          currency: tenant.baseCurrency,
          exchangeRate: '1.000000',
          baseDebit: parseFloat(l.debitAmount || '0').toFixed(4),
          baseCredit: parseFloat(l.creditAmount || '0').toFixed(4),
        })),
      }, tenant);

      onClose();
      onSuccess?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Opening Balance Journal Setup Wizard"
      subtitle="Establish starting double-entry balances for General Ledger accounts"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs">
            {isBalanced ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Balanced: ${totalDebit.toFixed(2)} {tenant.baseCurrency}
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Imbalance: Debits (${totalDebit.toFixed(2)}) != Credits (${totalCredit.toFixed(2)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isBalanced}
              onClick={handleSubmit}
            >
              Post Opening Balances
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Target Accounting Period"
            options={openPeriods.map((p) => ({ value: p.id, label: p.name }))}
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
          />

          <Input
            label="Opening Date"
            type="date"
            required
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
          />

          <Input
            label="Memo / Reference"
            required
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {/* Lines Editor */}
        <div className="p-3 bg-card/70 border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-bold text-foreground/90">Double-Entry Balance Allocations</span>
            <Button size="xs" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddLine}>
              Add Line
            </Button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-card border border-border grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <Select
                    label=""
                    options={accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                    value={line.accountId}
                    onChange={(e) => {
                      const copy = [...lines];
                      copy[idx].accountId = e.target.value;
                      setLines(copy);
                    }}
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    label=""
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => {
                      const copy = [...lines];
                      copy[idx].description = e.target.value;
                      setLines(copy);
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label=""
                    type="number"
                    step="0.01"
                    placeholder="Debit"
                    value={line.debitAmount}
                    onChange={(e) => {
                      const copy = [...lines];
                      copy[idx].debitAmount = e.target.value;
                      setLines(copy);
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label=""
                    type="number"
                    step="0.01"
                    placeholder="Credit"
                    value={line.creditAmount}
                    onChange={(e) => {
                      const copy = [...lines];
                      copy[idx].creditAmount = e.target.value;
                      setLines(copy);
                    }}
                  />
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
