// ============================================================================
// Supplier Bills Register, 3-Way Matching & GL Accounting Posting Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  CreditCard, 
  FileCheck2, 
  Scale
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { procurementService } from '@/modules/procurement/services/procurement.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { DbSupplierBillItem } from '@/database/types';

export const SupplierBillsView: React.FC<{
  initialSupplierId?: string;
  initialPOId?: string;
  onPayBill?: (billId: string) => void;
  onNavigateAccounting?: () => void;
}> = ({ initialSupplierId, initialPOId, onPayBill }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialPOId || !!initialSupplierId);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);

  const supplierBills = db.getSupplierBills(tenant);
  const suppliers = db.getSuppliers(tenant);
  const purchaseOrders = db.getPurchaseOrders(tenant).filter((po) => po.status !== 'draft');
  const journals = db.getJournalEntries(tenant);
  const accounts = db.getAccounts(tenant);

  const [form, setForm] = useState({
    billNumber: `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierInvoiceNumber: `INV-VEND-${Math.floor(10000 + Math.random() * 90000)}`,
    supplierId: initialSupplierId || suppliers[0]?.id || '',
    purchaseOrderId: initialPOId || '',
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currency: tenant.baseCurrency,
    notes: 'Approved supplier invoice for commercial goods/services.',
    items: [
      {
        id: 'bitem-1',
        description: 'Commercial Goods & Supplies',
        quantity: '2',
        unitPrice: '1200.0000',
        subtotal: '2400.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '120.0000',
        total: '2520.0000',
      },
    ] as DbSupplierBillItem[],
  });

  const handlePOChange = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setForm({
        ...form,
        purchaseOrderId: poId,
        supplierId: po.supplierId,
        items: po.items.map((it) => {
          const qty = parseFloat(it.quantity);
          const price = parseFloat(it.unitPrice);
          const sub = (qty * price).toFixed(4);
          const tax = (qty * price * 0.05).toFixed(4);
          const tot = (qty * price * 1.05).toFixed(4);
          return {
            id: `bitem-${it.id}`,
            poItemId: it.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: sub,
            taxCodeId: 'tc-vat5',
            taxAmount: tax,
            total: tot,
          };
        }),
      });
    }
  };

  const subtotal = form.items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);
  const taxTotal = form.items.reduce((sum, i) => sum + (parseFloat(i.taxAmount) || 0), 0);
  const total = subtotal + taxTotal;

  const handleCreateBill = () => {
    if (!form.supplierInvoiceNumber) {
      alert('Please provide the vendor invoice reference number.');
      return;
    }

    try {
      procurementService.createSupplierBill({
        billNumber: form.billNumber,
        supplierId: form.supplierId,
        supplierInvoiceNumber: form.supplierInvoiceNumber,
        purchaseOrderId: form.purchaseOrderId || undefined,
        billDate: form.billDate,
        dueDate: form.dueDate,
        currency: form.currency,
        exchangeRate: '1.000000',
        subtotal: subtotal.toFixed(4),
        taxTotal: taxTotal.toFixed(4),
        freightTotal: '0.0000',
        total: total.toFixed(4),
        amountPaid: '0.0000',
        balanceDue: total.toFixed(4),
        status: 'draft',
        matchStatus: 'matched',
        items: form.items,
        notes: form.notes,
      }, tenant);

      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostBill = (billId: string) => {
    try {
      procurementService.postSupplierBill(billId, tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredBills = supplierBills.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const sup = suppliers.find((s) => s.id === b.supplierId);
    const matchesSearch = !searchQuery || 
      b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplierInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedJournal = journals.find((j) => j.id === selectedJournalId);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Bills' },
            { id: 'draft', label: 'Draft' },
            { id: 'posted', label: 'Posted to GL' },
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bill #, vendor invoice, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Record Supplier Bill
          </Button>
        </div>
      </div>

      {/* Supplier Bills Register Table */}
      <Card
        title="Supplier Bills & Invoices"
        subtitle={`Showing ${filteredBills.length} accounts payable invoices with 3-way match status`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Bill #</th>
                <th className="px-5 py-3.5">Vendor Invoice #</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-center">3-Way Match</th>
                <th className="px-5 py-3.5 text-right">Bill Total</th>
                <th className="px-5 py-3.5 text-right">Balance Due</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredBills.map((b) => {
                const sup = suppliers.find((s) => s.id === b.supplierId);
                return (
                  <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{b.billNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-foreground/90">{b.supplierInvoiceNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{sup?.name || 'Vendor'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sup?.code}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{b.dueDate}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.matchStatus === 'matched' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        b.matchStatus === 'partially_matched' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        <Scale className="w-2.5 h-2.5" />
                        {b.matchStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-foreground">
                      ${parseFloat(b.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-400">
                      ${parseFloat(b.balanceDue).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={b.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {b.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handlePostBill(b.id)}
                          >
                            Post to GL
                          </Button>
                        )}

                        {b.journalEntryId && (
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={<FileCheck2 className="w-3 h-3 text-emerald-400" />}
                            onClick={() => setSelectedJournalId(b.journalEntryId || null)}
                          >
                            Journal
                          </Button>
                        )}

                        {b.status === 'posted' && parseFloat(b.balanceDue) > 0 && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CreditCard className="w-3 h-3" />}
                            onClick={() => onPayBill?.(b.id)}
                          >
                            Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                    No supplier bills recorded. Click "+ Record Supplier Bill" to enter an invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Bill Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Supplier Bill (Accounts Payable)"
        subtitle="Registers supplier invoice, evaluates 3-way match, and prepares GL posting."
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateBill}>
              Save Bill
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Internal Bill #"
              value={form.billNumber}
              onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
            />
            <Input
              label="Supplier Invoice Reference #"
              required
              placeholder="e.g. INV-998822"
              value={form.supplierInvoiceNumber}
              onChange={(e) => setForm({ ...form, supplierInvoiceNumber: e.target.value })}
            />
            <Select
              label="Supplier"
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Match against Purchase Order (Optional)"
              options={[
                { value: '', label: 'None (Direct Expense Bill)' },
                ...purchaseOrders.map((p) => ({ value: p.id, label: `${p.poNumber} ($${parseFloat(p.total).toFixed(2)})` })),
              ]}
              value={form.purchaseOrderId}
              onChange={(e) => handlePOChange(e.target.value)}
            />
            <Input
              label="Bill Date"
              type="date"
              value={form.billDate}
              onChange={(e) => setForm({ ...form, billDate: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div className="p-3.5 rounded-lg bg-card/60 border border-border space-y-2">
            <span className="text-xs font-bold uppercase text-foreground/90">Accounting Posting Preview:</span>
            <div className="text-xs space-y-1 text-muted-foreground font-mono">
              <div className="flex justify-between">
                <span>Debit Purchases / Expense (#5010):</span>
                <span className="text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Debit Input VAT Recoverable (#1450):</span>
                <span className="text-foreground">${taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold text-amber-400">
                <span>Credit Accounts Payable Control (#2010):</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Accounting Journal Drilldown Modal */}
      {selectedJournal && (
        <Modal
          isOpen={!!selectedJournal}
          onClose={() => setSelectedJournalId(null)}
          title={`General Ledger Journal: ${selectedJournal.entryNumber}`}
          subtitle={`Source: ${selectedJournal.sourceType?.toUpperCase()} • Status: POSTED (IMMUTABLE)`}
          size="lg"
          footer={
            <Button size="sm" variant="secondary" onClick={() => setSelectedJournalId(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/80 text-muted-foreground font-semibold uppercase">
                    <th className="px-4 py-2.5">Account Code & Name</th>
                    <th className="px-4 py-2.5 text-right">Debit</th>
                    <th className="px-4 py-2.5 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {selectedJournal.lines.map((line, idx) => {
                    const acc = accounts.find((a) => a.id === line.accountId);
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono font-bold text-sky-400">{acc?.code}</span>
                          <span className="text-foreground/90 ml-2">{acc?.name}</span>
                          <div className="text-[10px] text-muted-foreground">{line.description}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400">
                          {parseFloat(line.debitAmount) > 0 ? `$${parseFloat(line.debitAmount).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                          {parseFloat(line.creditAmount) > 0 ? `$${parseFloat(line.creditAmount).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
