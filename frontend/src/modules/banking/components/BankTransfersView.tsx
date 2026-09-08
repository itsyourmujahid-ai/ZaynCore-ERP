// ============================================================================
// Inter-Bank & Cash Transfers Component
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankingService } from '@/modules/banking/services/banking.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';

export const BankTransfersView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const bankAccounts = db.getBankAccounts(tenant);
  const cashAccounts = db.getCashAccounts(tenant);
  const allAccounts = [...bankAccounts, ...cashAccounts];

  const [fromAccountId, setFromAccountId] = useState(allAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(allAccounts[1]?.id || allAccounts[0]?.id || '');
  const [amount, setAmount] = useState('1000.00');
  const [feeAmount, setFeeAmount] = useState('5.00');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const transfers = db.getBankTransfers(tenant);

  const filteredTransfers = transfers.filter((t) =>
    t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (fromAccountId === toAccountId) {
      setErrorMsg('Source and Destination accounts cannot be identical.');
      return;
    }

    try {
      const trf = bankingService.createBankTransfer({
        fromBankAccountId: fromAccountId,
        toBankAccountId: toAccountId,
        transferDate,
        amount,
        currency: tenant.baseCurrency || 'USD',
        feeAmount,
        notes,
      }, tenant);

      // Auto-execute and post to GL
      bankingService.executeBankTransfer(trf.id, tenant);

      setIsCreateModalOpen(false);
      setAmount('1000.00');
      setFeeAmount('5.00');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute transfer.');
    }
  };

  const handleExecuteTransfer = (transferId: string) => {
    try {
      bankingService.executeBankTransfer(transferId, tenant);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch transfer.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transfers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg('');
            setIsCreateModalOpen(true);
          }}
        >
          New Bank Transfer
        </Button>
      </div>

      {/* Transfers Register Table */}
      <Card noPadding>
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowLeftRight className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No Transfers Recorded</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Transfer funds between corporate checking accounts, savings deposits, and physical cash drawers with paired ledger tracking.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Initiate Transfer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Transfer #</th>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Origin (Source Out)</th>
                  <th className="p-3">Destination (Target In)</th>
                  <th className="p-3 text-right">Transfer Amount</th>
                  <th className="p-3 text-right">Transfer Fee</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                {filteredTransfers.map((t) => {
                  const fromAcc = allAccounts.find((a) => a.id === t.fromBankAccountId);
                  const toAcc = allAccounts.find((a) => a.id === t.toBankAccountId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 font-mono text-[11px]">
                      <td className="p-3 font-bold text-brand-400">{t.transferNumber}</td>
                      <td className="p-3 text-slate-300 font-sans">{t.transferDate}</td>
                      <td className="p-3 font-sans font-medium text-slate-200">
                        {fromAcc?.accountName || t.fromBankAccountId}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-200">
                        {toAcc?.accountName || t.toBankAccountId}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-100">${t.amount}</td>
                      <td className="p-3 text-right text-slate-400">${t.feeAmount || '0.00'}</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="p-3 text-right">
                        {t.status !== 'posted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            onClick={() => handleExecuteTransfer(t.id)}
                          >
                            Dispatch & Post
                          </Button>
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

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initiate Inter-Account Transfer"
        size="md"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Source Account (Outflow) *"
              options={allAccounts.map((a) => ({
                value: a.id,
                label: `${a.accountName} ($${parseFloat(a.currentBalance).toFixed(2)})`,
              }))}
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
            />
            <Select
              label="Destination Account (Inflow) *"
              options={allAccounts.map((a) => ({
                value: a.id,
                label: `${a.accountName} ($${parseFloat(a.currentBalance).toFixed(2)})`,
              }))}
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Transfer Amount *"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              label="Transfer Fee (if any)"
              type="number"
              step="0.01"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
            />
            <Input
              label="Transfer Date *"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Transfer Notes / Reference"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Weekly operational liquidity top-up"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<ArrowLeftRight className="w-4 h-4" />}
            >
              Dispatch Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
