// ============================================================================
// Cash & Petty Cash Management + Physical Cash Counts Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Coins, 
  Plus, 
  Search, 
  UserCheck, 
  Scale
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankingService } from '@/modules/banking/services/banking.service';
import { bankReconciliationService } from '@/modules/banking/services/bank-reconciliation.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { CashAccountType } from '@/database/types';
import { BankAccountProfileModal } from './BankAccountProfileModal';

export const CashAccountsView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [countCashAccountId, setCountCashAccountId] = useState('');

  // Cash Account Form State
  const [accountName, setAccountName] = useState('');
  const [cashAccountType, setCashAccountType] = useState<CashAccountType>('petty_cash');
  const [custodianName, setCustodianName] = useState('');
  const [maxLimit, setMaxLimit] = useState('5000.00');
  const [currency, setCurrency] = useState(tenant.baseCurrency || 'USD');
  const [glAccountId, setGlAccountId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Count Audit Form State
  const [physicalCount, setPhysicalCount] = useState('0.00');
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [counterName, setCounterName] = useState(tenant.userFullName || 'Finance Auditor');
  const [countReason, setCountReason] = useState('Weekly Petty Cash Drawer Audit');
  const [countError, setCountError] = useState('');

  const cashAccounts = db.getCashAccounts(tenant);
  const accounts = db.getAccounts(tenant);
  const cashGlAccounts = accounts.filter((a) => a.code.startsWith('10') && a.classification === 'asset');
  const cashCounts = db.getCashCounts(undefined, tenant);

  const filteredCashAccounts = cashAccounts.filter(
    (c) =>
      c.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.custodianName && c.custodianName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);

  const handleCreateCashAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accountName.trim()) {
      setErrorMsg('Account / Drawer Name is required.');
      return;
    }

    const selectedGl = glAccountId || cashGlAccounts.find((a) => a.code === '1020')?.id || cashGlAccounts[0]?.id;
    if (!selectedGl) {
      setErrorMsg('Please select a valid GL Cash Asset account.');
      return;
    }

    try {
      const created = bankingService.createCashAccount({
        accountName,
        cashAccountType,
        custodianName,
        maxLimit,
        currency,
        glAccountId: selectedGl,
        openingBalance,
        notes,
      }, tenant);

      setIsCreateModalOpen(false);
      setSelectedAccountId(created.id);
      setAccountName('');
      setCustodianName('');
      setOpeningBalance('0.00');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create cash account.');
    }
  };

  const handleRecordCount = (e: React.FormEvent) => {
    e.preventDefault();
    setCountError('');

    if (!countCashAccountId) return;

    try {
      const count = bankReconciliationService.recordCashCount({
        cashAccountId: countCashAccountId,
        countDate,
        physicalCount,
        reason: countReason,
        counterName,
      }, tenant);

      // Auto-approve and post adjustment if variance exists
      bankReconciliationService.approveAndPostCashCountAdjustment(count.id, tenant);

      setIsCountModalOpen(false);
      setPhysicalCount('0.00');
    } catch (err: any) {
      setCountError(err.message || 'Failed to complete cash count audit.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search cash drawers by name or custodian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total Physical Vault & Petty Cash</span>
            <div className="text-sm font-bold font-mono text-amber-400">
              ${totalCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
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
            New Cash Drawer
          </Button>
        </div>
      </div>

      {/* Cash Drawers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCashAccounts.map((c) => {
          const glAcc = accounts.find((a) => a.id === c.glAccountId);
          return (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4
                      onClick={() => setSelectedAccountId(c.id)}
                      className="font-bold text-xs text-slate-100 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      {c.accountName}
                    </h4>
                    <p className="text-[11px] text-slate-400 capitalize">{c.cashAccountType.replace('_', ' ')}</p>
                  </div>
                </div>
                <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    <span>Custodian: {c.custodianName || 'General Staff'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    GL: {glAcc?.code}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Cash Balance</div>
                  <div className="text-sm font-bold font-mono text-amber-400">
                    ${parseFloat(c.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAccountId(c.id)}
                >
                  Ledger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Scale className="w-3.5 h-3.5 text-brand-400" />}
                  onClick={() => {
                    setCountCashAccountId(c.id);
                    setPhysicalCount(c.currentBalance);
                    setIsCountModalOpen(true);
                  }}
                >
                  Physical Count
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash Counts History Register */}
      <Card title="Recent Cash Count Audits & Reconciliations">
        {cashCounts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No physical cash count audits performed yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Audit #</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Drawer</th>
                  <th className="p-2.5 text-right">System Balance</th>
                  <th className="p-2.5 text-right">Physical Count</th>
                  <th className="p-2.5 text-right">Variance</th>
                  <th className="p-2.5">Auditor</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30 font-mono text-[11px]">
                {cashCounts.map((cc) => {
                  const drawer = cashAccounts.find((a) => a.id === cc.cashAccountId);
                  const diff = parseFloat(cc.difference);
                  return (
                    <tr key={cc.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-brand-400">{cc.countNumber}</td>
                      <td className="p-2.5 text-slate-400">{cc.countDate}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-200">{drawer?.accountName}</td>
                      <td className="p-2.5 text-right text-slate-300">${cc.systemBalance}</td>
                      <td className="p-2.5 text-right font-bold text-slate-100">${cc.physicalCount}</td>
                      <td className={`p-2.5 text-right font-bold ${
                        Math.abs(diff) < 0.0001
                          ? 'text-emerald-400'
                          : diff > 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}>
                        {diff > 0 ? `+$${diff.toFixed(2)}` : diff < 0 ? `-$${Math.abs(diff).toFixed(2)}` : '$0.00'}
                      </td>
                      <td className="p-2.5 font-sans text-slate-400">{cc.counterName}</td>
                      <td className="p-2.5 text-center">
                        <StatusBadge status={cc.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Cash Drawer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Cash Drawer / Vault"
        size="md"
      >
        <form onSubmit={handleCreateCashAccount} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Drawer / Account Name *"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. Sales Counter Drawer #1"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Cash Drawer Type *"
              options={[
                { value: 'petty_cash', label: 'Petty Cash' },
                { value: 'main_cash', label: 'Main Office Cash' },
                { value: 'branch_cash', label: 'Branch Safe' },
                { value: 'cash_counter', label: 'Cash Register POS' },
                { value: 'vault', label: 'Security Vault' },
              ]}
              value={cashAccountType}
              onChange={(e) => setCashAccountType(e.target.value as CashAccountType)}
            />
            <Input
              label="Assigned Custodian"
              value={custodianName}
              onChange={(e) => setCustodianName(e.target.value)}
              placeholder="e.g. Finance Officer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Maximum Drawer Limit"
              type="number"
              step="0.01"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
            />
            <Select
              label="Currency *"
              options={[
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'OMR', label: 'OMR - Omani Rial' },
              ]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
            <Select
              label="GL Cash Account *"
              options={cashGlAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
              value={glAccountId || cashGlAccounts.find((a) => a.code === '1020')?.id || cashGlAccounts[0]?.id || ''}
              onChange={(e) => setGlAccountId(e.target.value)}
            />
          </div>

          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />

          <Input
            label="Notes / Security Details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Primary cashier safe located in Room 102"
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
              icon={<Plus className="w-4 h-4" />}
            >
              Create Drawer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Physical Cash Count Audit Modal */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        title="Physical Cash Count & Variance Audit"
        size="md"
      >
        <form onSubmit={handleRecordCount} className="space-y-4">
          {countError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {countError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Selected Cash Drawer</div>
            <div className="text-xs font-bold text-slate-100">
              {cashAccounts.find((a) => a.id === countCashAccountId)?.accountName}
            </div>
            <div className="text-xs font-mono text-slate-300">
              Current System Balance: ${cashAccounts.find((a) => a.id === countCashAccountId)?.currentBalance}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Physical Count Value *"
              type="number"
              step="0.01"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(e.target.value)}
              required
            />
            <Input
              label="Count Date *"
              type="date"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Auditor / Counter Name *"
            value={counterName}
            onChange={(e) => setCounterName(e.target.value)}
            required
          />

          <Input
            label="Audit Notes / Reason for Count"
            value={countReason}
            onChange={(e) => setCountReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCountModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Scale className="w-4 h-4" />}
            >
              Post Audit & Adjust
            </Button>
          </div>
        </form>
      </Modal>

      <BankAccountProfileModal
        accountId={selectedAccountId}
        isOpen={!!selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
      />
    </div>
  );
};
