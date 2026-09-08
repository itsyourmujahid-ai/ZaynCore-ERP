// ============================================================================
// Sales Invoices Register, Tax Invoicing & Automatic GL Posting View
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  BookOpen, 
  DollarSign
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
import { DbSalesLineItem } from '@/database/types';

export const InvoicesView: React.FC<{
  initialCustomerId?: string;
  initialOrderId?: string;
  onNavigateAccounting?: () => void;
  onRecordPayment?: (invoiceId: string) => void;
}> = ({ initialCustomerId, initialOrderId, onRecordPayment }) => {
  const { tenant } = useAuth();
  const invoices = db.getSalesInvoices(tenant);
  const customers = db.getCustomers(tenant);
  const taxCodes = db.getTaxCodes(tenant);
  const orders = db.getSalesOrders(tenant);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Prepopulate from order if requested
  const prefillCustomer = initialCustomerId || customers[0]?.id || '';
  const prefillOrder = initialOrderId ? orders.find((o) => o.id === initialOrderId) : undefined;

  const [form, setForm] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: prefillCustomer,
    salesOrderId: prefillOrder?.id || '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    salesperson: prefillOrder?.salesperson || tenant.userFullName,
    currency: prefillOrder?.currency || tenant.baseCurrency,
    exchangeRate: prefillOrder?.exchangeRate || '1.000000',
    reference: prefillOrder ? `PO for ${prefillOrder.orderNumber}` : '',
    items: prefillOrder?.items ? prefillOrder.items : [
      {
        id: 'item-1',
        description: 'Enterprise ERP Implementation & Deployment Services',
        quantity: '1',
        unitPrice: '10000.0000',
        discountRate: '0.0000',
        taxCodeId: taxCodes[0]?.id || '',
        taxAmount: '500.0000',
        subtotal: '10000.0000',
        total: '10500.0000',
      } as DbSalesLineItem,
    ],
  });

  const recalculateItems = (items: DbSalesLineItem[]) => {
    return items.map((item) => {
      const qty = parseFloat(item.quantity || '0');
      const price = parseFloat(item.unitPrice || '0');
      const discRate = parseFloat(item.discountRate || '0');
      const subtotal = qty * price * (1 - discRate);

      const taxCode = taxCodes.find((t) => t.id === item.taxCodeId);
      const rate = taxCode ? parseFloat(taxCode.rate) : 0;
      const taxAmount = subtotal * rate;
      const total = subtotal + taxAmount;

      return {
        ...item,
        subtotal: subtotal.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
        total: total.toFixed(4),
      };
    });
  };

  const calculatedItems = recalculateItems(form.items);
  const subtotalSum = calculatedItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
  const taxSum = calculatedItems.reduce((sum, i) => sum + parseFloat(i.taxAmount), 0);
  const totalSum = subtotalSum + taxSum;

  const filteredInvoices = invoices.filter((i) => {
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesSearch = !searchQuery || 
      i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateInvoice = (shouldPostImmediately: boolean) => {
    if (!form.customerId) {
      alert('Please select a customer.');
      return;
    }

    try {
      const created = salesService.createInvoice({
        branchId: tenant.branchId,
        invoiceNumber: form.invoiceNumber,
        customerId: form.customerId,
        salesOrderId: form.salesOrderId || undefined,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        currency: form.currency,
        exchangeRate: form.exchangeRate,
        salesperson: form.salesperson,
        reference: form.reference,
        subtotal: subtotalSum.toFixed(4),
        discountTotal: '0.0000',
        taxTotal: taxSum.toFixed(4),
        total: totalSum.toFixed(4),
        status: 'draft',
        items: calculatedItems,
      }, tenant);

      if (shouldPostImmediately) {
        salesService.postInvoice(created.id, tenant);
      }

      setIsCreateModalOpen(false);
      setForm({
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: customers[0]?.id || '',
        salesOrderId: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        salesperson: tenant.userFullName,
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        reference: '',
        items: [
          {
            id: 'item-1',
            description: 'Enterprise ERP Implementation & Deployment Services',
            quantity: '1',
            unitPrice: '10000.0000',
            discountRate: '0.0000',
            taxCodeId: taxCodes[0]?.id || '',
            taxAmount: '500.0000',
            subtotal: '10000.0000',
            total: '10500.0000',
          } as DbSalesLineItem,
        ],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePostExistingInvoice = (invoiceId: string) => {
    try {
      salesService.postInvoice(invoiceId, tenant);
      setIsDetailModalOpen(false);
      alert('Invoice posted to General Ledger & AR Sub-Ledger successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getLinkedJournal = (journalEntryId?: string) => {
    if (!journalEntryId) return null;
    return db.getJournalEntries(tenant).find((j) => j.id === journalEntryId);
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'posted', label: 'Posted' },
            { id: 'draft', label: 'Draft' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoice # or reference..."
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
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <Card
        title="Sales Invoices Register"
        subtitle={`Showing ${filteredInvoices.length} tax billing documents`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Invoice Date</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-right">Invoice Total</th>
                <th className="px-5 py-3.5 text-right">Balance Due</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredInvoices.map((inv) => {
                const customer = customers.find((c) => c.id === inv.customerId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400 shrink-0">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-100 max-w-[180px] truncate" title={customer?.name || 'Unknown Customer'}>
                      {customer?.name || 'Unknown Customer'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300 whitespace-nowrap">{inv.invoiceDate}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">{inv.dueDate}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-200">
                      ${parseFloat(inv.total).toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-400">
                      ${parseFloat(inv.balanceDue).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={inv.status} size="xs" /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          View
                        </Button>

                        {inv.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handlePostExistingInvoice(inv.id)}
                          >
                            Post to GL
                          </Button>
                        )}

                        {inv.status === 'posted' && parseFloat(inv.balanceDue) > 0 && (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={<DollarSign className="w-3 h-3" />}
                            onClick={() => onRecordPayment?.(inv.id)}
                          >
                            Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No sales invoices recorded. Click "+ Create Invoice" to issue a billing document.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Details & Journal Drilldown Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sales Invoice: ${selectedInvoice.invoiceNumber}`}
          subtitle={`Customer: ${customers.find((c) => c.id === selectedInvoice.customerId)?.name || 'Client'}`}
          size="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedInvoice.status} size="sm" />
                {selectedInvoice.journalEntryId && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    GL Linked: {selectedInvoice.journalEntryId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedInvoice.journalEntryId && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<BookOpen className="w-3.5 h-3.5 text-brand-400" />}
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setIsJournalModalOpen(true);
                    }}
                  >
                    View Accounting Journal
                  </Button>
                )}
                {selectedInvoice.status === 'draft' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handlePostExistingInvoice(selectedInvoice.id)}
                  >
                    Post to General Ledger
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Invoice Date</span>
                <span className="text-slate-200 font-mono mt-0.5">{selectedInvoice.invoiceDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Due Date</span>
                <span className="text-slate-200 font-mono mt-0.5">{selectedInvoice.dueDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Invoiced</span>
                <span className="text-slate-100 font-mono font-bold mt-0.5">${parseFloat(selectedInvoice.total).toFixed(2)} {selectedInvoice.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Balance Due</span>
                <span className="text-amber-400 font-mono font-bold mt-0.5">${parseFloat(selectedInvoice.balanceDue).toFixed(2)}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Tax</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">${parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">${parseFloat(item.taxAmount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Accounting Journal Voucher Inspection Modal */}
      {selectedInvoice && selectedInvoice.journalEntryId && (
        <Modal
          isOpen={isJournalModalOpen}
          onClose={() => setIsJournalModalOpen(false)}
          title="Accounting Journal Voucher (GL Traceability)"
          subtitle={`Double-Entry General Ledger Record for ${selectedInvoice.invoiceNumber}`}
          size="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400">
                General Ledger Control Account: <strong>#1200 (Accounts Receivable)</strong>
              </span>
              <Button variant="secondary" size="sm" onClick={() => setIsJournalModalOpen(false)}>
                Done
              </Button>
            </div>
          }
        >
          {(() => {
            const journal = getLinkedJournal(selectedInvoice.journalEntryId);
            if (!journal) {
              return <div className="p-4 text-center text-slate-500 text-xs">Linked journal entry not found.</div>;
            }
            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-brand-400 text-sm">{journal.entryNumber}</span>
                    <div className="text-slate-400 text-[11px] mt-0.5">{journal.memo}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm">${journal.totalDebit} {journal.currency}</span>
                    <div className="text-[10px] text-slate-500 font-mono">Posted: {journal.postingDate}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-2.5">Line Description</th>
                        <th className="px-4 py-2.5 text-right">Debit</th>
                        <th className="px-4 py-2.5 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {journal.lines.map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="px-4 py-2.5">{l.description}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                            {parseFloat(l.debitAmount) > 0 ? `$${parseFloat(l.debitAmount).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sky-400">
                            {parseFloat(l.creditAmount) > 0 ? `$${parseFloat(l.creditAmount).toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Commercial Sales Invoice"
        subtitle={`Issue tax billing document and trigger automated Accounts Receivable double-entry`}
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-300 font-mono">
              Total: <strong className="text-emerald-400 text-sm">${totalSum.toFixed(2)} {form.currency}</strong> (Includes ${taxSum.toFixed(2)} Tax)
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleCreateInvoice(false)}>
                Save as Draft
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleCreateInvoice(true)}>
                Post to General Ledger
              </Button>
            </div>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Invoice Number"
              required
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
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

            <Input
              label="Reference / PO #"
              placeholder="e.g. PO-77889"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Invoice Date"
              type="date"
              required
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            />

            <Input
              label="Due Date"
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />

            <Input
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          {/* Line Items Editor */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Invoice Items & Taxes</span>
              <Button
                size="xs"
                variant="secondary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setForm({
                    ...form,
                    items: [
                      ...form.items,
                      {
                        id: 'item-' + (form.items.length + 1),
                        description: 'Technical Support & SLA Maintenance',
                        quantity: '1',
                        unitPrice: '1500.0000',
                        discountRate: '0.0000',
                        taxCodeId: taxCodes[0]?.id || '',
                        taxAmount: '75.0000',
                        subtotal: '1500.0000',
                        total: '1575.0000',
                      },
                    ],
                  });
                }}
              >
                Add Line Item
              </Button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {form.items.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-5">
                    <Input
                      label=""
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...form.items];
                        copy[idx].description = e.target.value;
                        setForm({ ...form, items: copy });
                      }}
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      label=""
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...form.items];
                        copy[idx].quantity = e.target.value;
                        setForm({ ...form, items: copy });
                      }}
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      label=""
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const copy = [...form.items];
                        copy[idx].unitPrice = e.target.value;
                        setForm({ ...form, items: copy });
                      }}
                    />
                  </div>

                  <div className="col-span-2">
                    <Select
                      label=""
                      options={taxCodes.map((t) => ({ value: t.id, label: t.name }))}
                      value={item.taxCodeId || ''}
                      onChange={(e) => {
                        const copy = [...form.items];
                        copy[idx].taxCodeId = e.target.value;
                        setForm({ ...form, items: copy });
                      }}
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (form.items.length <= 1) return;
                        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
