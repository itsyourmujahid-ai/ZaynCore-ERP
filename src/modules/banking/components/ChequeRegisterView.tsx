// ============================================================================
// Cheque Management & Post-Dated Cheques (PDC) Register Component
// ============================================================================

import React, { useState } from 'react';
import { 
  FileCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle
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

export const ChequeRegisterView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Form State
  const [chequeType, setChequeType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankName, setBankName] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('500.00');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const bankAccounts = db.getBankAccounts(tenant);
  const cheques = db.getCheques(tenant);

  const filteredCheques = cheques.filter((c) => {
    const matchesType = selectedType === 'all' || c.chequeType === selectedType;
    const matchesSearch =
      c.chequeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.payeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bankName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleIssueCheque = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!chequeNumber.trim() || !payeeName.trim() || !bankName.trim()) {
      setErrorMsg('Cheque Number, Bank Name, and Payee Name are required.');
      return;
    }

    try {
      bankingService.issueCheque({
        chequeType,
        chequeNumber,
        bankAccountId: bankAccountId || bankAccounts[0]?.id,
        bankName,
        payeeName,
        issueDate,
        dueDate,
        amount,
        currency: tenant.baseCurrency || 'USD',
        notes,
      }, tenant);

      setIsIssueModalOpen(false);
      setChequeNumber('');
      setPayeeName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record cheque.');
    }
  };

  const handleClearCheque = (id: string) => {
    bankingService.clearCheque(id, tenant);
  };

  const handleBounceCheque = (id: string) => {
    bankingService.bounceCheque(id, tenant);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cheques by number, payee, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Cheques (Incoming & Outgoing)</option>
            <option value="incoming">Incoming Cheques (Customer Deposits)</option>
            <option value="outgoing">Outgoing Cheques (Vendor Disbursements)</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg('');
            setBankName(bankAccounts[0]?.bankName || '');
            setIsIssueModalOpen(true);
          }}
        >
          Issue / Record Cheque
        </Button>
      </div>

      {/* Cheques Register Table */}
      <Card noPadding>
        {filteredCheques.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCheck className="w-10 h-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground/90">No Cheques Recorded</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Track incoming customer payment cheques and outgoing vendor corporate cheques with maturity due-date alerts.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsIssueModalOpen(true)}
            >
              Record First Cheque
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Cheque #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Payee / Issuer</th>
                  <th className="p-3">Bank Institution</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Maturity / Due Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                {filteredCheques.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-brand-400">{c.chequeNumber}</td>
                    <td className="p-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.chequeType === 'incoming'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {c.chequeType === 'incoming' ? 'Incoming (AR)' : 'Outgoing (AP)'}
                      </span>
                    </td>
                    <td className="p-3 font-sans font-medium text-foreground">{c.payeeName}</td>
                    <td className="p-3 font-sans text-muted-foreground">{c.bankName}</td>
                    <td className="p-3 text-muted-foreground">{c.issueDate}</td>
                    <td className="p-3 text-foreground/90 font-bold">{c.dueDate}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">${parseFloat(c.amount).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3 text-right">
                      {c.status !== 'cleared' && c.status !== 'bounced' && (
                        <div className="flex gap-1 justify-end font-sans">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            onClick={() => handleClearCheque(c.id)}
                          >
                            Clear
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            onClick={() => handleBounceCheque(c.id)}
                          >
                            Bounce
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Issue Cheque Modal */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Record Bank Cheque"
        size="md"
      >
        <form onSubmit={handleIssueCheque} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Cheque Direction *"
              options={[
                { value: 'outgoing', label: 'Outgoing (Vendor Payment Disbursement)' },
                { value: 'incoming', label: 'Incoming (Customer Deposit Receipt)' },
              ]}
              value={chequeType}
              onChange={(e) => setChequeType(e.target.value as any)}
            />
            <Input
              label="Cheque Number *"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
              placeholder="e.g. CHQ-009182"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Associated Bank Account"
              options={[
                { value: '', label: 'None / External Counterparty Bank' },
                ...bankAccounts.map((b) => ({ value: b.id, label: `${b.accountName} (${b.bankName})` }))
              ]}
              value={bankAccountId}
              onChange={(e) => {
                setBankAccountId(e.target.value);
                const b = bankAccounts.find((x) => x.id === e.target.value);
                if (b) setBankName(b.bankName);
              }}
            />
            <Input
              label="Bank Name *"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Bank Muscat"
              required
            />
            <Input
              label="Payee / Issuer Name *"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g. Global Tech Solutions LLC"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Cheque Amount *"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              label="Issue Date *"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
            <Input
              label="Maturity Due Date *"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes / Reference"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Post-dated cheque for Invoice #INV-2026-101"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<FileCheck className="w-4 h-4" />}
            >
              Save Cheque Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
