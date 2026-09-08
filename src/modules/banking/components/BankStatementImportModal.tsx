// ============================================================================
// Modular Bank Statement Electronic Import Modal Component
// ============================================================================

import React, { useState } from 'react';
import { 
  FileUp, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { bankReconciliationService, ImportStatementLineInput } from '@/modules/banking/services/bank-reconciliation.service';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted?: (statementId: string) => void;
}

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const { tenant } = useAuth();
  const bankAccounts = db.getBankAccounts(tenant);

  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [statementNumber, setStatementNumber] = useState(`STMT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [closingBalance, setClosingBalance] = useState('0.00');
  const [csvContent, setCsvContent] = useState(
`2026-09-01,Customer Wire Deposit - Apex Client,RCPT-9921,5000.00,debit,TX-EXT-101
2026-09-02,Supplier Wire Disbursement - Alpha Logistics,SPMT-1001,1500.00,credit,TX-EXT-102
2026-09-03,Monthly Account Maintenance Fee,FEE-SEP-26,25.00,credit,TX-EXT-103
2026-09-03,Deposit Interest Income Credit,INT-SEP-26,12.50,debit,TX-EXT-104`
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!bankAccountId) {
      setErrorMsg('Please select a target Bank Account.');
      return;
    }

    try {
      // Parse CSV
      const lines: ImportStatementLineInput[] = [];
      const rows = csvContent.trim().split('\n');

      for (const row of rows) {
        if (!row.trim() || row.startsWith('#')) continue;
        const cols = row.split(',').map((c) => c.trim());
        if (cols.length >= 4) {
          lines.push({
            lineDate: cols[0],
            description: cols[1],
            reference: cols[2],
            amount: cols[3],
            debitCredit: (cols[4]?.toLowerCase() === 'credit' ? 'credit' : 'debit') as 'debit' | 'credit',
            externalTransactionId: cols[5] || `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
          });
        }
      }

      if (lines.length === 0) {
        setErrorMsg('No valid transaction lines found in CSV.');
        return;
      }

      const result = bankReconciliationService.importBankStatement({
        bankAccountId,
        statementNumber,
        statementDate,
        startDate,
        endDate,
        openingBalance,
        closingBalance,
        filename: 'bank_statement_import.csv',
        lines,
      }, tenant);

      setSuccessMsg(
        `Successfully imported ${result.lines.length} lines. (${result.duplicatesSkipped} duplicates skipped). Auto-match engine executed.`
      );

      setTimeout(() => {
        if (onImportCompleted) onImportCompleted(result.statement.id);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import bank statement.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Electronic Bank Statement"
      size="lg"
    >
      <form onSubmit={handleImport} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Target Bank Account *"
            options={bankAccounts.map((b) => ({
              value: b.id,
              label: `${b.accountName} (${b.bankName})`,
            }))}
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          />
          <Input
            label="Statement Number *"
            value={statementNumber}
            onChange={(e) => setStatementNumber(e.target.value)}
            required
          />
          <Input
            label="Statement Date *"
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date *"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
          <Input
            label="Closing Balance *"
            type="number"
            step="0.01"
            value={closingBalance}
            onChange={(e) => setClosingBalance(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Statement Data (CSV Format: Date, Description, Reference, Amount, Type [debit/credit], ExternalID)
          </label>
          <textarea
            rows={5}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<FileUp className="w-4 h-4" />}
          >
            Process & Auto-Match Statement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
