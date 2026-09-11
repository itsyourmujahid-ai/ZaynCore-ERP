// ============================================================================
// Supplier Credit Notes & Debit Notes (Returns & Adjustments) Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Building2 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { procurementService } from '@/modules/procurement/services/procurement.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';

export const SupplierCreditDebitNotesView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [noteType, setNoteType] = useState<'credit' | 'debit'>('credit');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const creditNotes = db.getSupplierCreditNotes(tenant);
  const debitNotes = db.getSupplierDebitNotes(tenant);
  const suppliers = db.getSuppliers(tenant);
  const bills = db.getSupplierBills(tenant).filter((b) => b.status === 'posted');

  const [form, setForm] = useState({
    docNumber: `SCN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: suppliers[0]?.id || '',
    billId: '',
    reason: 'Damaged goods return / agreed vendor rebate',
    amount: '350.0000',
    taxAmount: '17.5000',
    date: new Date().toISOString().slice(0, 10),
  });

  const handleCreateNote = () => {
    try {
      const net = parseFloat(form.amount) || 0;
      const tax = parseFloat(form.taxAmount) || 0;
      const total = (net + tax).toFixed(4);

      if (noteType === 'credit') {
        procurementService.createCreditNote({
          creditNoteNumber: form.docNumber,
          supplierId: form.supplierId,
          billId: form.billId || undefined,
          date: form.date,
          reason: form.reason,
          subtotal: net.toFixed(4),
          taxAmount: tax.toFixed(4),
          total,
          currency: tenant.baseCurrency,
          exchangeRate: '1.000000',
          items: [
            {
              description: form.reason,
              quantity: '1',
              unitPrice: net.toFixed(4),
              subtotal: net.toFixed(4),
              taxAmount: tax.toFixed(4),
              total,
            },
          ],
        }, tenant);
      } else {
        procurementService.createDebitNote({
          debitNoteNumber: form.docNumber,
          supplierId: form.supplierId,
          billId: form.billId || undefined,
          date: form.date,
          reason: form.reason,
          subtotal: net.toFixed(4),
          taxAmount: tax.toFixed(4),
          total,
          currency: tenant.baseCurrency,
          exchangeRate: '1.000000',
          items: [
            {
              description: form.reason,
              quantity: '1',
              unitPrice: net.toFixed(4),
              subtotal: net.toFixed(4),
              taxAmount: tax.toFixed(4),
              total,
            },
          ],
        }, tenant);
      }

      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentList = noteType === 'credit' ? creditNotes : debitNotes;
  const filteredList = currentList.filter((n) => {
    const sup = suppliers.find((s) => s.id === n.supplierId);
    const num = 'creditNoteNumber' in n ? n.creditNoteNumber : n.debitNoteNumber;
    return !searchQuery || 
      num.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.reason.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNoteType('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              noteType === 'credit' ? 'bg-brand-600 text-white shadow-sm' : 'bg-muted text-muted-foreground'
            }`}
          >
            Credit Notes (Returns/Rebates)
          </button>
          <button
            onClick={() => setNoteType('debit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              noteType === 'debit' ? 'bg-brand-600 text-white shadow-sm' : 'bg-muted text-muted-foreground'
            }`}
          >
            Debit Notes (Price Corrections)
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reference # or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setForm({
                ...form,
                docNumber: noteType === 'credit' 
                  ? `SCN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` 
                  : `SDN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              });
              setIsCreateModalOpen(true);
            }}
          >
            Issue {noteType === 'credit' ? 'Credit Note' : 'Debit Note'}
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card
        title={`Supplier ${noteType === 'credit' ? 'Credit Notes' : 'Debit Notes'}`}
        subtitle={`Managing adjustments with automated General Ledger double-entry posting`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Document #</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Adjustment Reason</th>
                <th className="px-5 py-3.5 text-right">Tax Amount</th>
                <th className="px-5 py-3.5 text-right">Total Adjustment</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredList.map((n) => {
                const sup = suppliers.find((s) => s.id === n.supplierId);
                const docNum = 'creditNoteNumber' in n ? n.creditNoteNumber : n.debitNoteNumber;
                return (
                  <tr key={n.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{docNum}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{sup?.name || 'Vendor'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{n.date}</td>
                    <td className="px-5 py-3.5 text-foreground/90 max-w-xs truncate">{n.reason}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                      ${parseFloat(n.taxAmount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-400">
                      ${parseFloat(n.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Posted to GL
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No adjustments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={`Issue Supplier ${noteType === 'credit' ? 'Credit Note' : 'Debit Note'}`}
        subtitle="Automatic double-entry posting against AP Control #2010 and Expense/Tax accounts."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateNote}>
              Post Adjustment to GL
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Document #"
              value={form.docNumber}
              onChange={(e) => setForm({ ...form, docNumber: e.target.value })}
            />
            <Select
              label="Supplier"
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Associated Bill (Optional)"
              options={[
                { value: '', label: 'None (Direct Account Adjustment)' },
                ...bills.filter((b) => b.supplierId === form.supplierId).map((b) => ({ value: b.id, label: `${b.billNumber} ($${parseFloat(b.total).toFixed(2)})` })),
              ]}
              value={form.billId}
              onChange={(e) => setForm({ ...form, billId: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Adjustment Subtotal ($)"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Tax Amount ($)"
              type="number"
              value={form.taxAmount}
              onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
            />
          </div>

          <Input
            label="Reason / Commercial Justification"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
