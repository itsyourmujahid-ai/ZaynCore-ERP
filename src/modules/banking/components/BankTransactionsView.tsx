// ============================================================================
// Bank & Cash Transactions Ledger Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankingService } from '@/modules/banking/services/banking.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';

export const BankTransactionsView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State for General Transaction / Bank Charge
  const [formType, setFormType] = useState<'charge' | 'interest' | 'receipt' | 'payment'>('charge');
  const [formAccountId, setFormAccountId] = useState('');
  const [amount, setAmount] = useState('15.00');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [contraAccountId, setContraAccountId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const bankAccounts = db.getBankAccounts(tenant);
  const cashAccounts = db.getCashAccounts(tenant);
  const allAccounts = [...bankAccounts, ...cashAccounts];
  const allTransactions = db.getBankTransactions(undefined, tenant).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  const accounts = db.getAccounts(tenant);

  const filteredTransactions = allTransactions.filter((tx) => {
    const matchesAccount = selectedAccountId === 'all' || tx.bankAccountId === selectedAccountId;
    const matchesType = selectedType === 'all' || tx.transactionType === selectedType;
    const matchesSearch =
      tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAccount && matchesType && matchesSearch;
  });

  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetAccId = formAccountId || bankAccounts[0]?.id || cashAccounts[0]?.id;
    if (!targetAccId) {
      setErrorMsg('Please select a valid Bank or Cash Account.');
      return;
    }

    try {
      const ref = reference.trim() || `TX-${Date.now().toString(36).toUpperCase()}`;

      if (formType === 'charge') {
        bankingService.recordBankCharge({
          bankAccountId: targetAccId,
          transactionDate: date,
          amount,
          currency: tenant.baseCurrency || 'USD',
          reference: ref,
          description: description || 'Monthly Bank Account Maintenance Fee',
        }, tenant);
      } else if (formType === 'interest') {
        bankingService.recordBankInterest({
          bankAccountId: targetAccId,
          transactionDate: date,
          amount,
          currency: tenant.baseCurrency || 'USD',
          reference: ref,
          description: description || 'Monthly Deposit Interest Earned',
        }, tenant);
      } else if (formType === 'receipt') {
        bankingService.recordGeneralReceipt({
          bankAccountId: targetAccId,
          transactionDate: date,
          amount,
          currency: tenant.baseCurrency || 'USD',
          contraAccountId: contraAccountId || accounts.find((a) => a.code === '4090')?.id,
          reference: ref,
          description: description || 'Miscellaneous Income Receipt',
        }, tenant);
      } else if (formType === 'payment') {
        bankingService.recordGeneralPayment({
          bankAccountId: targetAccId,
          transactionDate: date,
          amount,
          currency: tenant.baseCurrency || 'USD',
          contraAccountId: contraAccountId || accounts.find((a) => a.code === '6090')?.id,
          reference: ref,
          description: description || 'Miscellaneous Operating Expense',
        }, tenant);
      }

      setIsRecordModalOpen(false);
      setReference('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record transaction.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by transaction #, ref, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Bank & Cash Accounts</option>
            {allAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountName} (${parseFloat(a.currentBalance).toFixed(2)})
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Movement Types</option>
            <option value="receipt">Customer / General Receipts (IN)</option>
            <option value="payment">Supplier / General Payments (OUT)</option>
            <option value="transfer_in">Transfer In (IN)</option>
            <option value="transfer_out">Transfer Out (OUT)</option>
            <option value="bank_charge">Bank Charge Fee (OUT)</option>
            <option value="interest">Bank Interest Income (IN)</option>
            <option value="deposit">Deposit (IN)</option>
            <option value="withdrawal">Withdrawal (OUT)</option>
            <option value="adjustment">Audit Adjustment</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg('');
            setIsRecordModalOpen(true);
          }}
        >
          Record Transaction
        </Button>
      </div>

      {/* Global Transactions Register Table */}
      <Card noPadding>
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No bank or cash movements found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Reference / Tx #</th>
                  <th className="p-3">Account Hub</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Dir</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                {filteredTransactions.map((tx) => {
                  const acc = allAccounts.find((a) => a.id === tx.bankAccountId);
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{tx.transactionDate}</td>
                      <td className="p-3">
                        <span className="font-bold text-brand-400">{tx.reference || tx.transactionNumber}</span>
                        <div className="font-sans text-[10px] text-muted-foreground">{tx.transactionNumber}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-foreground">{acc?.accountName || tx.bankAccountId}</div>
                        <div className="text-[10px] text-muted-foreground">{acc ? ('bankName' in acc ? acc.bankName : 'Cash Drawer') : ''}</div>
                      </td>
                      <td className="p-3 font-sans text-foreground/90 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="p-3 uppercase text-[10px] text-muted-foreground">
                        {tx.transactionType.replace('_', ' ')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tx.debitCredit === 'debit'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {tx.debitCredit === 'debit' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.debitCredit === 'debit' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        tx.debitCredit === 'debit' ? 'text-emerald-400' : 'text-foreground'
                      }`}>
                        {tx.debitCredit === 'debit' ? `+$${parseFloat(tx.amount).toFixed(2)}` : `-$${parseFloat(tx.amount).toFixed(2)}`}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.reconciliationStatus === 'reconciled'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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

      {/* Record Direct Transaction Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Direct Bank / Treasury Transaction"
        size="md"
      >
        <form onSubmit={handleRecordTransaction} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Transaction Type *"
              options={[
                { value: 'charge', label: 'Bank Service Charge / Fee (Expense)' },
                { value: 'interest', label: 'Interest Income Received (Revenue)' },
                { value: 'receipt', label: 'Direct General Receipt (Inward)' },
                { value: 'payment', label: 'Direct General Payment (Outward)' },
              ]}
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
            />
            <Select
              label="Bank / Cash Account *"
              options={allAccounts.map((a) => ({
                value: a.id,
                label: `${a.accountName} (${a.currency})`,
              }))}
              value={formAccountId || allAccounts[0]?.id || ''}
              onChange={(e) => setFormAccountId(e.target.value)}
            />
          </div>

          {(formType === 'receipt' || formType === 'payment') && (
            <Select
              label="Offset / Contra GL Account *"
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name} (${a.classification})`,
              }))}
              value={contraAccountId || (formType === 'receipt' ? accounts.find((a) => a.code === '4090')?.id : accounts.find((a) => a.code === '6090')?.id) || ''}
              onChange={(e) => setContraAccountId(e.target.value)}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              label="Transaction Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reference #"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. CHG-2026-SEP or REC-9921"
          />

          <Input
            label="Description / Memo *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly corporate account maintenance charge"
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Post to General Ledger
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
