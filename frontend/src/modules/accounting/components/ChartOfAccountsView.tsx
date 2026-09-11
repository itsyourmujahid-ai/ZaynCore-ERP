// ============================================================================
// Chart of Accounts (COA) General Ledger Management (Phase 4 Hierarchical)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Badge } from '@/ui/components/Badge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { AccountType, NormalBalance } from '@/core/types/common';
import { Can } from '@/modules/authorization/components/Can';

export const ChartOfAccountsView: React.FC = () => {
  const { tenant } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const groups = db.getAccountGroups(tenant);
  const accounts = db.getAccounts(tenant);

  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    groupId: groups[0]?.id || '',
    parentAccountId: '',
    accountType: 'asset' as AccountType,
    level: 2,
    normalBalance: 'debit' as NormalBalance,
    currency: tenant.baseCurrency,
    isControlAccount: false,
    isReconciliationAccount: false,
    isSystemAccount: false,
    allowManualJournal: true,
    description: '',
  });

  const filteredAccounts = accounts.filter((acc) => {
    const accType = acc.accountType || acc.classification;
    const matchesType = filterType === 'all' || accType === filterType;
    const matchesSearch = acc.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          acc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.code || !accountForm.name) return;

    try {
      db.createAccount({
        groupId: accountForm.groupId,
        parentAccountId: accountForm.parentAccountId || undefined,
        code: accountForm.code,
        name: accountForm.name,
        accountType: accountForm.accountType,
        classification: accountForm.accountType,
        level: accountForm.level,
        normalBalance: accountForm.normalBalance,
        currency: accountForm.currency,
        isActive: true,
        isControlAccount: accountForm.isControlAccount,
        isReconciliationAccount: accountForm.isReconciliationAccount,
        isSystemAccount: accountForm.isSystemAccount,
        allowManualJournal: accountForm.allowManualJournal,
        description: accountForm.description,
      }, tenant);

      setIsAccountModalOpen(false);
      setAccountForm({
        code: '',
        name: '',
        groupId: groups[0]?.id || '',
        parentAccountId: '',
        accountType: 'asset',
        level: 2,
        normalBalance: 'debit',
        currency: tenant.baseCurrency,
        isControlAccount: false,
        isReconciliationAccount: false,
        isSystemAccount: false,
        allowManualJournal: true,
        description: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getClassificationBadge = (cls: AccountType | string) => {
    switch (cls) {
      case 'asset': return <Badge variant="success" size="xs">ASSET</Badge>;
      case 'liability': return <Badge variant="warning" size="xs">LIABILITY</Badge>;
      case 'equity': return <Badge variant="purple" size="xs">EQUITY</Badge>;
      case 'revenue': return <Badge variant="info" size="xs">REVENUE</Badge>;
      case 'cost_of_sales': return <Badge variant="danger" size="xs">COST OF SALES</Badge>;
      case 'expense': return <Badge variant="danger" size="xs">EXPENSE</Badge>;
      case 'other_income': return <Badge variant="info" size="xs">OTHER INCOME</Badge>;
      case 'other_expense': return <Badge variant="default" size="xs">OTHER EXPENSE</Badge>;
      default: return <Badge variant="default" size="xs">{cls}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">General Ledger Foundation</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{tenant.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Chart of Accounts</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Hierarchical general ledger accounts supporting 8 account types, sub-ledger reconciliation, and posting controls.
          </p>
        </div>

        <Can permission="accounting.manage_coa">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAccountModalOpen(true)}
          >
            Add General Ledger Account
          </Button>
        </Can>
      </div>

      {/* Filter & Search Bar */}
      <Card noPadding>
        <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Accounts' },
              { id: 'asset', label: 'Assets' },
              { id: 'liability', label: 'Liabilities' },
              { id: 'equity', label: 'Equity' },
              { id: 'revenue', label: 'Revenue' },
              { id: 'cost_of_sales', label: 'COGS' },
              { id: 'expense', label: 'Expenses' },
              { id: 'other_income', label: 'Other Inc' },
              { id: 'other_expense', label: 'Other Exp' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none whitespace-nowrap ${
                  filterType === t.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-muted text-foreground/90 hover:text-foreground hover:bg-slate-200/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search account code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted text-foreground/90 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Account Name</th>
                <th className="px-5 py-3.5">Account Type</th>
                <th className="px-5 py-3.5">Normal Balance</th>
                <th className="px-5 py-3.5">Currency</th>
                <th className="px-5 py-3.5">Reconciliation Control</th>
                <th className="px-5 py-3.5 text-right">Manual Posting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-brand-600">
                    {acc.code}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span style={{ paddingLeft: `${(acc.level - 1) * 12}px` }}>{acc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {getClassificationBadge(acc.accountType || acc.classification)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      acc.normalBalance === 'debit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}>
                      {acc.normalBalance.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-foreground/90 font-medium">
                    {acc.currency}
                  </td>
                  <td className="px-5 py-3.5">
                    {acc.isControlAccount || acc.isReconciliationAccount ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sub-Ledger Control
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-medium">Standard GL</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {acc.allowManualJournal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground/90 border border-border">
                        Allowed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 inline-flex">
                        <Lock className="w-3 h-3" /> Auto Only
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No accounts matching "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Account Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Add General Ledger Account"
        subtitle={`Configure a new GL account in the Chart of Accounts for ${tenant.companyName}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateAccount}>
              Save Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Account Code"
              required
              placeholder="e.g. 1050 or 6050"
              value={accountForm.code}
              onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
            />
            <Input
              label="Account Name"
              required
              placeholder="e.g. Software Subscriptions"
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Account Type"
              options={[
                { value: 'asset', label: 'Asset' },
                { value: 'liability', label: 'Liability' },
                { value: 'equity', label: 'Equity' },
                { value: 'revenue', label: 'Operating Revenue' },
                { value: 'cost_of_sales', label: 'Cost of Sales (COGS)' },
                { value: 'expense', label: 'Operating & Admin Expense' },
                { value: 'other_income', label: 'Other Income' },
                { value: 'other_expense', label: 'Other Expense' },
              ]}
              value={accountForm.accountType}
              onChange={(e) => {
                const val = e.target.value as AccountType;
                const debNormal = val === 'asset' || val === 'expense' || val === 'cost_of_sales' || val === 'other_expense';
                setAccountForm({ 
                  ...accountForm, 
                  accountType: val,
                  normalBalance: debNormal ? 'debit' : 'credit'
                });
              }}
            />

            <Select
              label="Normal Balance"
              options={[
                { value: 'debit', label: 'Debit (Assets, Expenses, COGS)' },
                { value: 'credit', label: 'Credit (Liabilities, Equity, Revenue)' },
              ]}
              value={accountForm.normalBalance}
              onChange={(e) => setAccountForm({ ...accountForm, normalBalance: e.target.value as NormalBalance })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Account Group"
              options={groups.map((g) => ({
                value: g.id,
                label: `${g.code} - ${g.name}`,
              }))}
              value={accountForm.groupId}
              onChange={(e) => setAccountForm({ ...accountForm, groupId: e.target.value })}
            />

            <Select
              label="Parent Account (Optional)"
              options={[
                { value: '', label: 'None (Root Level 1)' },
                ...accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` })),
              ]}
              value={accountForm.parentAccountId}
              onChange={(e) => setAccountForm({ ...accountForm, parentAccountId: e.target.value })}
            />
          </div>

          <Input
            label="Description"
            placeholder="Account usage and purpose"
            value={accountForm.description}
            onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
          />

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-foreground/90 cursor-pointer">
              <input
                type="checkbox"
                checked={accountForm.isControlAccount}
                onChange={(e) => setAccountForm({ ...accountForm, isControlAccount: e.target.checked, isReconciliationAccount: e.target.checked })}
                className="rounded bg-card border-border text-brand-600 focus:ring-brand-500"
              />
              <span>Sub-Ledger Control Account (Reconciliation required)</span>
            </label>

            <label className="flex items-center gap-2 text-foreground/90 cursor-pointer">
              <input
                type="checkbox"
                checked={accountForm.allowManualJournal}
                onChange={(e) => setAccountForm({ ...accountForm, allowManualJournal: e.target.checked })}
                className="rounded bg-card border-border text-brand-600 focus:ring-brand-500"
              />
              <span>Allow Manual Journal Entry</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
