// ============================================================================
// Sales Credit Notes & AR Reversal Adjustments View
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { salesService } from '../services/sales.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';

export const CreditNotesView: React.FC = () => {
  const { tenant } = useAuth();
  const creditNotes = db.getSalesCreditNotes(tenant);
  const customers = db.getCustomers(tenant);
  const invoices = db.getSalesInvoices(tenant).filter((i) => i.status === 'posted');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    creditNoteNumber: `CN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: customers[0]?.id || '',
    invoiceId: '',
    date: new Date().toISOString().slice(0, 10),
    reason: 'Billing correction / Service adjustment',
    amount: '500.0000',
    taxAmount: '25.0000',
    currency: tenant.baseCurrency,
    exchangeRate: '1.000000',
  });

  const filteredCNs = creditNotes.filter((cn) => {
    return !searchQuery || 
      cn.creditNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cn.reason.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateCreditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || parseFloat(form.amount || '0') <= 0) {
      alert('Please select a customer and enter a valid adjustment amount.');
      return;
    }

    try {
      salesService.createCreditNote({
        creditNoteNumber: form.creditNoteNumber,
        customerId: form.customerId,
        invoiceId: form.invoiceId || undefined,
        date: form.date,
        reason: form.reason,
        subtotal: (parseFloat(form.amount) - parseFloat(form.taxAmount || '0')).toFixed(4),
        taxAmount: parseFloat(form.taxAmount || '0').toFixed(4),
        total: parseFloat(form.amount).toFixed(4),
        currency: form.currency,
        exchangeRate: form.exchangeRate,
        items: [],
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        creditNoteNumber: `CN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: customers[0]?.id || '',
        invoiceId: '',
        date: new Date().toISOString().slice(0, 10),
        reason: 'Billing correction / Service adjustment',
        amount: '500.0000',
        taxAmount: '25.0000',
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
      });
      alert('Sales Credit Note posted! General Ledger revenue & AR have been adjusted.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search credit note # or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Issue Credit Note
        </Button>
      </div>

      {/* Credit Notes Table */}
      <Card
        title="Sales Credit Notes Register"
        subtitle={`Showing ${filteredCNs.length} customer credit adjustment documents`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Credit Note #</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5 text-right">Adjustment Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCNs.map((cn) => {
                const customer = customers.find((c) => c.id === cn.customerId);
                return (
                  <tr key={cn.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-rose-400">{cn.creditNoteNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-100">{customer?.name || 'Unknown Customer'}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{cn.date}</td>
                    <td className="px-5 py-3.5 text-slate-300">{cn.reason}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-400">
                      -${parseFloat(cn.total).toFixed(2)} {cn.currency}
                    </td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={cn.status} size="xs" /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => {
                          setSelectedCreditNote(cn);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCNs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No sales credit notes recorded. Click "Issue Credit Note" to apply legitimate price reductions or returns.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Credit Note Details Modal */}
      {selectedCreditNote && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Credit Note: ${selectedCreditNote.creditNoteNumber}`}
          subtitle={`Adjustment for ${customers.find((c) => c.id === selectedCreditNote.customerId)?.name || 'Client'}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400">
                GL Post: <strong>Dr #4010 Revenue / Cr #1200 AR</strong>
              </span>
              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Adjustment Total:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -${parseFloat(selectedCreditNote.total).toFixed(2)} {selectedCreditNote.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax Component:</span>
                <span className="font-mono text-slate-300">
                  -${parseFloat(selectedCreditNote.taxAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason:</span>
                <span className="text-slate-200">{selectedCreditNote.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-slate-300">{selectedCreditNote.date}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Credit Note Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue Sales Credit Note"
        subtitle="Post accounting reduction against Sales Revenue and Accounts Receivable control"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-300 font-mono">
              Total Credit: <strong className="text-rose-400 text-sm">-${parseFloat(form.amount || '0').toFixed(2)} {form.currency}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateCreditNote}>
                Post Credit Note to GL
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateCreditNote} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Credit Note Number"
              required
              value={form.creditNoteNumber}
              onChange={(e) => setForm({ ...form, creditNoteNumber: e.target.value })}
            />

            <Select
              label="Customer"
              options={[
                { value: '', label: 'Select Customer...' },
                ...customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })),
              ]}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Linked Invoice (Optional)"
              options={[
                { value: '', label: 'None / General Account Credit' },
                ...invoices
                  .filter((i) => !form.customerId || i.customerId === form.customerId)
                  .map((i) => ({ value: i.id, label: `${i.invoiceNumber} ($${i.balanceDue} due)` })),
              ]}
              value={form.invoiceId}
              onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
            />

            <Input
              label="Credit Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Total Credit Amount"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />

            <Input
              label="Tax Portion (VAT Reversal)"
              type="number"
              step="0.01"
              value={form.taxAmount}
              onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
            />
          </div>

          <Input
            label="Reason for Credit Note"
            required
            placeholder="e.g. Overbilling correction, return of defective item"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
