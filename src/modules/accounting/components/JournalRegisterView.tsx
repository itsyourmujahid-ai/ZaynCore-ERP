// ============================================================================
// General Journal Register & Double-Entry Posting View (Phase 4 Enhanced)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  Eye, 
  AlertCircle,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { FinancialAmount } from '@/ui/data-display/FinancialAmount';
import { Can } from '@/modules/authorization/components/Can';
import { areDebitsAndCreditsBalanced, createMoney } from '@/core/utils/money';
import { DropdownMenu } from '@/ui/components/DropdownMenu';

export const JournalRegisterView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewJournalModalOpen, setIsNewJournalModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('Fiscal adjustment reversal');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const journals = db.getJournalEntries(tenant);
  const accounts = db.getAccounts(tenant);
  const periods = db.getAccountingPeriods(tenant);
  const openPeriods = periods.filter((p) => p.status === 'open');

  // Form for new journal entry
  const [journalForm, setJournalForm] = useState({
    periodId: openPeriods[0]?.id || '',
    entryNumber: `JV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    memo: '',
    entryDate: new Date().toISOString().slice(0, 10),
    currency: tenant.baseCurrency,
    exchangeRate: '1.000000',
    isDraft: false,
    lines: [
      { accountId: accounts[0]?.id || '', description: 'Debit Entry', debitAmount: '1000.0000', creditAmount: '0.0000', departmentId: '', costCenterId: '' },
      { accountId: accounts[1]?.id || '', description: 'Credit Entry', debitAmount: '0.0000', creditAmount: '1000.0000', departmentId: '', costCenterId: '' },
    ],
  });

  const totalDebit = journalForm.lines.reduce((sum, l) => sum + parseFloat(l.debitAmount || '0'), 0);
  const totalCredit = journalForm.lines.reduce((sum, l) => sum + parseFloat(l.creditAmount || '0'), 0);
  const isBalanced = areDebitsAndCreditsBalanced(
    createMoney(totalDebit.toFixed(4), journalForm.currency),
    createMoney(totalCredit.toFixed(4), journalForm.currency)
  );

  const filteredJournals = journals.filter((j) => {
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    const matchesSearch = !searchQuery || 
      j.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      j.memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.sourceModule.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateJournal = (isDraft: boolean) => {
    if (!isDraft && !isBalanced) {
      alert('Cannot post unbalanced journal! Total Debits must equal Total Credits.');
      return;
    }

    try {
      const rate = parseFloat(journalForm.exchangeRate || '1.000000');
      db.postJournalEntry({
        companyId: tenant.companyId,
        branchId: tenant.branchId,
        periodId: journalForm.periodId,
        entryNumber: journalForm.entryNumber,
        entryDate: journalForm.entryDate,
        postingDate: journalForm.entryDate,
        sourceModule: 'manual_journal',
        sourceType: 'manual_voucher',
        sourceId: journalForm.entryNumber,
        postingEvent: 'MANUAL_JOURNAL_POSTED',
        memo: journalForm.memo || 'Manual Adjustment Entry',
        totalDebit: totalDebit.toFixed(4),
        totalCredit: totalCredit.toFixed(4),
        currency: journalForm.currency,
        exchangeRate: journalForm.exchangeRate,
        status: isDraft ? 'draft' : 'posted',
        lines: journalForm.lines.map((l, i) => ({
          accountId: l.accountId,
          lineNumber: i + 1,
          description: l.description,
          debitAmount: parseFloat(l.debitAmount || '0').toFixed(4),
          creditAmount: parseFloat(l.creditAmount || '0').toFixed(4),
          currency: journalForm.currency,
          exchangeRate: journalForm.exchangeRate,
          baseDebit: (parseFloat(l.debitAmount || '0') * rate).toFixed(4),
          baseCredit: (parseFloat(l.creditAmount || '0') * rate).toFixed(4),
          departmentId: l.departmentId || undefined,
          costCenterId: l.costCenterId || undefined,
        })),
      }, tenant);

      setIsNewJournalModalOpen(false);
      setJournalForm({
        periodId: openPeriods[0]?.id || '',
        entryNumber: `JV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        memo: '',
        entryDate: new Date().toISOString().slice(0, 10),
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        isDraft: false,
        lines: [
          { accountId: accounts[0]?.id || '', description: 'Debit Entry', debitAmount: '1000.0000', creditAmount: '0.0000', departmentId: '', costCenterId: '' },
          { accountId: accounts[1]?.id || '', description: 'Credit Entry', debitAmount: '0.0000', creditAmount: '1000.0000', departmentId: '', costCenterId: '' },
        ],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReverseJournal = () => {
    if (!selectedEntry) return;
    try {
      db.reverseJournalEntry(selectedEntry.id, reverseReason, tenant);
      setIsReverseModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const viewEntryDetails = (entry: any) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">General Ledger</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Tenant: {tenant.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">General Journal Register</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable general journal entries generated by automated posting engines or manual adjustments.
          </p>
        </div>

        <Can permission="accounting.post">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewJournalModalOpen(true)}
          >
            Create Adjustment Journal
          </Button>
        </Can>
      </div>

      {/* Immutability Banner */}
      <div className="p-3.5 rounded-xl bg-card border border-border text-xs text-foreground/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
          <span>Posted accounting journals are <strong>strictly immutable</strong>. Corrections create a linked Reversal Entry.</span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 shrink-0">Double-Entry Verified</span>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Journals' },
            { id: 'posted', label: 'Posted' },
            { id: 'draft', label: 'Drafts' },
            { id: 'reversed', label: 'Reversed' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search voucher number or memo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Journals Table */}
      <Card
        title="Journal Entries"
        subtitle={`Showing ${filteredJournals.length} journal records in ledger (${tenant.baseCurrency})`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Entry Number</th>
                <th className="px-5 py-3.5">Posting Date</th>
                <th className="px-5 py-3.5">Source Module</th>
                <th className="px-5 py-3.5">Memo / Description</th>
                <th className="px-5 py-3.5 text-right">Debit / Credit Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredJournals.map((j) => (
                <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-brand-400">
                    {j.entryNumber}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-foreground/90">
                    {j.postingDate}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-foreground/90 border border-border">
                      {j.sourceModule}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-foreground max-w-xs truncate">
                    {j.memo}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <FinancialAmount amount={j.totalDebit} currency={j.currency} size="sm" type="debit" />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <StatusBadge status={j.status} size="xs" />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => viewEntryDetails(j)}
                      >
                        Inspect
                      </Button>
                      <DropdownMenu
                        variant="dots"
                        items={[
                          { label: 'View Line Items', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => viewEntryDetails(j) },
                          ...(j.status === 'posted' ? [
                            { 
                              label: 'Reverse Journal Entry', 
                              icon: <RotateCcw className="w-3.5 h-3.5 text-rose-400" />, 
                              danger: true,
                              onClick: () => { setSelectedEntry(j); setIsReverseModalOpen(true); } 
                            }
                          ] : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredJournals.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No journal entries recorded for active company context.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Journal Details & Line Items Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Journal Entry: ${selectedEntry.entryNumber}`}
          subtitle={`Posting Date: ${selectedEntry.postingDate} • Source: ${selectedEntry.sourceModule}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedEntry.status} size="sm" />
                {selectedEntry.reversedByEntryId && (
                  <span className="text-xs text-rose-400">
                    Reversed in entry ID: {selectedEntry.reversedByEntryId}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedEntry.status === 'posted' && (
                  <Can permission="accounting.reverse">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => setIsReverseModalOpen(true)}
                    >
                      Reverse Journal
                    </Button>
                  </Can>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-card/70 border border-border text-xs">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Memo / Business Justification</span>
              <p className="text-foreground mt-1 font-medium">{selectedEntry.memo}</p>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Line #</th>
                    <th className="px-4 py-2.5">Account Code & Name</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Debit ({selectedEntry.currency})</th>
                    <th className="px-4 py-2.5 text-right">Credit ({selectedEntry.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {selectedEntry.lines.map((line: any) => {
                    const acc = accounts.find((a) => a.id === line.accountId);
                    return (
                      <tr key={line.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{line.lineNumber}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-brand-400 mr-2">{acc?.code}</span>
                          <span className="text-foreground/90">{acc?.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{line.description}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {parseFloat(line.debitAmount) > 0 ? (
                            <span className="text-emerald-400">{line.debitAmount}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {parseFloat(line.creditAmount) > 0 ? (
                            <span className="text-sky-400">{line.creditAmount}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-card/90 font-bold border-t border-border text-foreground">
                    <td colSpan={3} className="px-4 py-2.5 text-right">Totals Balanced:</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{selectedEntry.totalDebit}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sky-400">{selectedEntry.totalCredit}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Reverse Modal */}
      {selectedEntry && (
        <Modal
          isOpen={isReverseModalOpen}
          onClose={() => setIsReverseModalOpen(false)}
          title="Confirm Journal Reversal"
          subtitle={`A reversing entry (${selectedEntry.entryNumber}-REV) with inverted lines will be posted.`}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsReverseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReverseJournal}>
                Post Reversal
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <Input
              label="Reversal Reason"
              required
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
            <p className="text-muted-foreground">
              The original journal entry will be marked as <strong>REVERSED</strong>. Both entries will remain in the general ledger and audit trail.
            </p>
          </div>
        </Modal>
      )}

      {/* New Journal Modal */}
      <Modal
        isOpen={isNewJournalModalOpen}
        onClose={() => setIsNewJournalModalOpen(false)}
        title="Post Manual Adjustment Journal"
        subtitle={`Creates balanced double-entry record in ${tenant.companyName}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs">
              {isBalanced ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Balanced: {totalDebit.toFixed(2)} {journalForm.currency}
                </span>
              ) : (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Imbalance: Debits (${totalDebit.toFixed(2)}) != Credits (${totalCredit.toFixed(2)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsNewJournalModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleCreateJournal(true)}>
                Save as Draft
              </Button>
              <Button variant="primary" size="sm" disabled={!isBalanced} onClick={() => handleCreateJournal(false)}>
                Post to General Ledger
              </Button>
            </div>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Journal Voucher #"
              required
              value={journalForm.entryNumber}
              onChange={(e) => setJournalForm({ ...journalForm, entryNumber: e.target.value })}
            />
            <Select
              label="Accounting Period"
              options={openPeriods.map((p) => ({ value: p.id, label: p.name }))}
              value={journalForm.periodId}
              onChange={(e) => setJournalForm({ ...journalForm, periodId: e.target.value })}
            />
            <Input
              label="Posting Date"
              type="date"
              required
              value={journalForm.entryDate}
              onChange={(e) => setJournalForm({ ...journalForm, entryDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Currency"
              value={journalForm.currency}
              onChange={(e) => setJournalForm({ ...journalForm, currency: e.target.value })}
            />
            <Input
              label="Exchange Rate to Base"
              type="number"
              step="0.000001"
              value={journalForm.exchangeRate}
              onChange={(e) => setJournalForm({ ...journalForm, exchangeRate: e.target.value })}
            />
          </div>

          <Input
            label="Memo / Business Purpose"
            placeholder="e.g. Month-end prepaid insurance amortization"
            required
            value={journalForm.memo}
            onChange={(e) => setJournalForm({ ...journalForm, memo: e.target.value })}
          />

          {/* 2-line editor with dimensions */}
          <div className="p-3 bg-card/70 border border-border rounded-lg space-y-3">
            <span className="text-xs font-bold text-foreground/90 block">Double-Entry Lines (Debit / Credit)</span>
            
            {/* Line 1 (Debit) */}
            <div className="p-2.5 rounded-lg bg-card border border-border space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="Debit Account"
                  options={accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                  value={journalForm.lines[0].accountId}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[0].accountId = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
                <Input
                  label="Description"
                  value={journalForm.lines[0].description}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[0].description = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
                <Input
                  label="Debit Amount"
                  type="number"
                  step="0.01"
                  value={journalForm.lines[0].debitAmount}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[0].debitAmount = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
              </div>
            </div>

            {/* Line 2 (Credit) */}
            <div className="p-2.5 rounded-lg bg-card border border-border space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  label="Credit Account"
                  options={accounts.map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                  value={journalForm.lines[1].accountId}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[1].accountId = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
                <Input
                  label="Description"
                  value={journalForm.lines[1].description}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[1].description = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
                <Input
                  label="Credit Amount"
                  type="number"
                  step="0.01"
                  value={journalForm.lines[1].creditAmount}
                  onChange={(e) => {
                    const newLines = [...journalForm.lines];
                    newLines[1].creditAmount = e.target.value;
                    setJournalForm({ ...journalForm, lines: newLines });
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
