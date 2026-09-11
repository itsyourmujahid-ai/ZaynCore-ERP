// ============================================================================
// General Ledger Account Drill-Down & Running Balance View
// ============================================================================

import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { generalLedgerService } from '../services/general-ledger.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Select } from '@/ui/components/Select';
import { Input } from '@/ui/components/Input';

export const AccountLedgerDetailView: React.FC = () => {
  const { tenant } = useAuth();
  const accounts = db.getAccounts(tenant);
  const branches = db.getBranches(tenant);

  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const ledgerData = selectedAccountId
    ? generalLedgerService.getAccountLedger(
        selectedAccountId,
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          branchId: selectedBranchId || undefined,
        },
        tenant
      )
    : null;

  const filteredTransactions = (ledgerData?.transactions || []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.entryNumber.toLowerCase().includes(q) ||
      t.memo.toLowerCase().includes(q) ||
      t.lineDescription.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Account Selector & Filters Bar */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="General Ledger Account"
            options={accounts.map((a) => ({
              value: a.id,
              label: `${a.code} - ${a.name} (${a.accountType.toUpperCase()})`,
            }))}
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          />

          <Select
            label="Operating Branch"
            options={[
              { value: '', label: 'All Company Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          />

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-border/80">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end">
            <Button
              variant="outline"
              size="xs"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Print Ledger
            </Button>
            <Button
              variant="secondary"
              size="xs"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert('Exporting account ledger CSV...')}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Opening Balance</span>
            <div className="text-base font-mono font-bold text-foreground mt-1">
              ${parseFloat(ledgerData.openingBalance).toFixed(2)} {ledgerData.currency}
            </div>
            <span className="text-[10px] text-muted-foreground">Prior Period Cumulative</span>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> Period Total Debits
            </span>
            <div className="text-base font-mono font-bold text-emerald-400 mt-1">
              ${parseFloat(ledgerData.periodDebit).toFixed(2)} {ledgerData.currency}
            </div>
            <span className="text-[10px] text-muted-foreground">Inflow Transactions</span>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Period Total Credits
            </span>
            <div className="text-base font-mono font-bold text-sky-400 mt-1">
              ${parseFloat(ledgerData.periodCredit).toFixed(2)} {ledgerData.currency}
            </div>
            <span className="text-[10px] text-muted-foreground">Outflow Transactions</span>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border">
            <span className="text-[10px] uppercase font-bold text-brand-400">Closing Balance</span>
            <div className="text-base font-mono font-bold text-brand-300 mt-1">
              ${parseFloat(ledgerData.closingBalance).toFixed(2)} {ledgerData.currency}
            </div>
            <span className="text-[10px] text-muted-foreground">Normal Balance: {ledgerData.account.normalBalance.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Transactions Table with Running Balance */}
      <Card
        title={`General Ledger: ${ledgerData?.account.code} - ${ledgerData?.account.name}`}
        subtitle={`Classification: ${ledgerData?.account.accountType.toUpperCase()} • Normal Balance: ${ledgerData?.account.normalBalance.toUpperCase()}`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Posting Date</th>
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Memo / Line Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredTransactions.map((tx, idx) => (
                <tr key={`${tx.journalEntryId}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-foreground/90">{tx.postingDate}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-brand-400">{tx.entryNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-foreground/90">
                      {tx.sourceModule}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">{tx.memo}</div>
                    <div className="text-[11px] text-muted-foreground">{tx.lineDescription}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                    {parseFloat(tx.debitAmount) > 0 ? `$${parseFloat(tx.debitAmount).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sky-400">
                    {parseFloat(tx.creditAmount) > 0 ? `$${parseFloat(tx.creditAmount).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                    ${parseFloat(tx.runningBalance).toFixed(2)}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions recorded for this account in the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
