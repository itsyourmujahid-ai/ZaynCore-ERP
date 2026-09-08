// ============================================================================
// Sales Quotations Register & Quote Builder Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ArrowRight, 
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
import { DbSalesLineItem } from '@/database/types';

export const QuotationsView: React.FC<{
  onConvertedToOrder?: () => void;
}> = ({ onConvertedToOrder }) => {
  const { tenant } = useAuth();
  const quotations = db.getSalesQuotations(tenant);
  const customers = db.getCustomers(tenant);
  const taxCodes = db.getTaxCodes(tenant);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [form, setForm] = useState({
    quotationNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: customers[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    salesperson: tenant.userFullName,
    currency: tenant.baseCurrency,
    exchangeRate: '1.000000',
    notes: 'Price valid for 30 days from issuance.',
    items: [
      {
        id: 'item-1',
        description: 'Enterprise Cloud SaaS Subscription (Annual)',
        quantity: '1',
        unitPrice: '12000.0000',
        discountRate: '0.0000',
        taxCodeId: taxCodes[0]?.id || '',
        taxAmount: '600.0000',
        subtotal: '12000.0000',
        total: '12600.0000',
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

  const filteredQuotes = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesSearch = !searchQuery || 
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      alert('Please select a customer.');
      return;
    }

    try {
      salesService.createQuotation({
        quotationNumber: form.quotationNumber,
        customerId: form.customerId,
        date: form.date,
        validUntil: form.validUntil,
        salesperson: form.salesperson,
        currency: form.currency,
        exchangeRate: form.exchangeRate,
        subtotal: subtotalSum.toFixed(4),
        discountTotal: '0.0000',
        taxTotal: taxSum.toFixed(4),
        total: totalSum.toFixed(4),
        notes: form.notes,
        status: 'draft',
        items: calculatedItems,
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        quotationNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: customers[0]?.id || '',
        date: new Date().toISOString().slice(0, 10),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        salesperson: tenant.userFullName,
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        notes: 'Price valid for 30 days from issuance.',
        items: [
          {
            id: 'item-1',
            description: 'Enterprise Cloud SaaS Subscription (Annual)',
            quantity: '1',
            unitPrice: '12000.0000',
            discountRate: '0.0000',
            taxCodeId: taxCodes[0]?.id || '',
            taxAmount: '600.0000',
            subtotal: '12000.0000',
            total: '12600.0000',
          } as DbSalesLineItem,
        ],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvertToOrder = (quoteId: string) => {
    try {
      salesService.convertQuotationToOrder(quoteId, tenant);
      setIsDetailModalOpen(false);
      onConvertedToOrder?.();
      alert('Quotation successfully converted to confirmed Sales Order!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Quotes' },
            { id: 'draft', label: 'Draft' },
            { id: 'sent', label: 'Sent' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'expired', label: 'Expired' },
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
              placeholder="Search quote # or customer..."
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
            Create Quote
          </Button>
        </div>
      </div>

      {/* Quotations Table */}
      <Card
        title="Sales Quotations Register"
        subtitle={`Showing ${filteredQuotes.length} formal sales quotes issued to prospective & existing clients`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Quote #</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Quote Date</th>
                <th className="px-5 py-3.5">Valid Until</th>
                <th className="px-5 py-3.5 text-right">Tax Total</th>
                <th className="px-5 py-3.5 text-right">Total Quote Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredQuotes.map((q) => {
                const customer = customers.find((c) => c.id === q.customerId);
                return (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">{q.quotationNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-100">{customer?.name || 'Unknown Customer'}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{q.date}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{q.validUntil}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-400">${parseFloat(q.taxTotal).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-100">${parseFloat(q.total).toFixed(2)} {q.currency}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={q.status} size="xs" /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedQuote(q);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Inspect
                        </Button>
                        {q.status !== 'accepted' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={<ArrowRight className="w-3 h-3" />}
                            onClick={() => handleConvertToOrder(q.id)}
                          >
                            Convert
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No quotations found. Click "+ Create Quote" to generate your first price proposal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quote Details Modal */}
      {selectedQuote && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Quotation: ${selectedQuote.quotationNumber}`}
          subtitle={`Issued to ${customers.find((c) => c.id === selectedQuote.customerId)?.name || 'Customer'}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={selectedQuote.status} size="sm" />
              <div className="flex items-center gap-2">
                {selectedQuote.status !== 'accepted' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => handleConvertToOrder(selectedQuote.id)}
                  >
                    Convert to Sales Order
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
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Quote Date</span>
                <span className="text-slate-200 font-mono mt-0.5">{selectedQuote.date}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Valid Until</span>
                <span className="text-slate-200 font-mono mt-0.5">{selectedQuote.validUntil}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Sales Representative</span>
                <span className="text-slate-200 mt-0.5">{selectedQuote.salesperson || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Amount</span>
                <span className="text-emerald-400 font-mono font-bold mt-0.5">${parseFloat(selectedQuote.total).toFixed(2)} {selectedQuote.currency}</span>
              </div>
            </div>

            {/* Line Items Table */}
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
                  {selectedQuote.items.map((item: any, idx: number) => (
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

      {/* Create Quote Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Sales Quotation"
        subtitle={`Generate formal price quote proposal for ${tenant.companyName}`}
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
              <Button variant="primary" size="sm" onClick={handleCreateQuotation}>
                Save Quotation
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Quote Number"
              required
              value={form.quotationNumber}
              onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })}
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
              label="Salesperson"
              value={form.salesperson}
              onChange={(e) => setForm({ ...form, salesperson: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Quote Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <Input
              label="Valid Until"
              type="date"
              required
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
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
              <span className="text-xs font-bold text-slate-300">Quote Line Items</span>
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
                        description: 'Consulting & Implementation Services',
                        quantity: '1',
                        unitPrice: '2500.0000',
                        discountRate: '0.0000',
                        taxCodeId: taxCodes[0]?.id || '',
                        taxAmount: '125.0000',
                        subtotal: '2500.0000',
                        total: '2625.0000',
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
                      placeholder="Item Description"
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

          <Input
            label="Terms & Conditions / Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
