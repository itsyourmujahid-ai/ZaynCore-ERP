// ============================================================================
// Bank Account Directory & Master Management Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Landmark, 
  Plus, 
  Search, 
  Lock
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
import { BankAccountType } from '@/database/types';
import { BankAccountProfileModal } from './BankAccountProfileModal';

export const BankAccountDirectoryView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [accountType, setAccountType] = useState<BankAccountType>('current');
  const [currency, setCurrency] = useState(tenant.baseCurrency || 'USD');
  const [glAccountId, setGlAccountId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const bankAccounts = db.getBankAccounts(tenant);
  const accounts = db.getAccounts(tenant);
  const bankGlAccounts = accounts.filter((a) => a.code.startsWith('10') && a.classification === 'asset');

  const filteredAccounts = bankAccounts.filter(
    (b) =>
      b.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.iban && b.iban.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + parseFloat(b.currentBalance), 0);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accountName.trim() || !bankName.trim() || !accountNumber.trim()) {
      setErrorMsg('Account Name, Bank Name, and Account Number are required.');
      return;
    }

    const selectedGl = glAccountId || bankGlAccounts[0]?.id;
    if (!selectedGl) {
      setErrorMsg('Please select a valid GL Bank Asset account.');
      return;
    }

    try {
      const created = bankingService.createBankAccount({
        accountName,
        bankName,
        branch,
        accountNumber,
        iban,
        swiftBic,
        accountType,
        currency,
        glAccountId: selectedGl,
        openingBalance,
        openingBalanceDate,
        isDefault,
        notes,
      }, tenant);

      setIsCreateModalOpen(false);
      setSelectedAccountId(created.id);
      setAccountName('');
      setBankName('');
      setBranch('');
      setAccountNumber('');
      setIban('');
      setSwiftBic('');
      setOpeningBalance('0.00');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register bank account.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bank accounts by name, bank, IBAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Liquid Bank Funds</span>
            <div className="text-sm font-bold font-mono text-emerald-400">
              ${totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            Register Bank Account
          </Button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const glAcc = accounts.find((a) => a.id === acc.glAccountId);
          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className="p-4 rounded-xl bg-muted/50 border border-border hover:border-border hover:bg-card/80 transition-all cursor-pointer space-y-3 relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground group-hover:text-brand-400 transition-colors">
                      {acc.accountName}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">{acc.bankName}</p>
                  </div>
                </div>
                <StatusBadge status={acc.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="pt-2 border-t border-border/60 flex items-end justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    {bankingService.getMaskedAccountNumber(acc.accountNumber)}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    GL: {glAcc?.code}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase">Book Balance</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    ${parseFloat(acc.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {acc.isDefault && (
                <div className="absolute top-2 right-12">
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[9px] font-bold uppercase">
                    Default
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <Card noPadding>
          <div className="p-12 text-center space-y-3">
            <Landmark className="w-10 h-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground/90">No Bank Accounts Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Configure corporate checking, savings, and multi-currency bank accounts for enterprise treasury management.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Register First Bank Account
            </Button>
          </div>
        </Card>
      )}

      {/* Register Bank Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Commercial Bank Account"
        size="lg"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Account Name *"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Operating Checking Account"
              required
            />
            <Input
              label="Bank Institution Name *"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Bank Muscat Corporate"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Account Number (Protected) *"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 109283819283"
              required
            />
            <Input
              label="IBAN"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="e.g. OM88BMUS109283819283"
            />
            <Input
              label="SWIFT / BIC Code"
              value={swiftBic}
              onChange={(e) => setSwiftBic(e.target.value)}
              placeholder="e.g. BMUSOMRX"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Account Type *"
              options={[
                { value: 'current', label: 'Current / Checking Account' },
                { value: 'savings', label: 'Savings Account' },
                { value: 'credit_card', label: 'Credit Card Account' },
                { value: 'other', label: 'Other Treasury Account' },
              ]}
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as BankAccountType)}
            />
            <Select
              label="Currency *"
              options={[
                { value: 'USD', label: 'USD - US Dollar' },
                { value: 'EUR', label: 'EUR - Euro' },
                { value: 'OMR', label: 'OMR - Omani Rial' },
                { value: 'GBP', label: 'GBP - British Pound' },
                { value: 'AED', label: 'AED - UAE Dirham' },
              ]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
            <Select
              label="GL Bank Asset Account *"
              options={bankGlAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} - ${a.name}`,
              }))}
              value={glAccountId || bankGlAccounts[0]?.id || ''}
              onChange={(e) => setGlAccountId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Opening Book Balance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
            <Input
              label="Opening Balance Date"
              type="date"
              value={openingBalanceDate}
              onChange={(e) => setOpeningBalanceDate(e.target.value)}
            />
          </div>

          <Input
            label="Branch / Location"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g. Corporate Banking HQ, Muscat"
          />

          <Input
            label="Account Notes / Purpose"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Main corporate operations and vendor disbursements"
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultBank"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded bg-card border-border text-brand-500 focus:ring-0"
            />
            <label htmlFor="isDefaultBank" className="text-xs text-foreground/90 select-none cursor-pointer">
              Set as primary default bank account for AR Receipts and AP Disbursements
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
              Register Account
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
