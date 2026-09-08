// ============================================================================
// Requests for Quotation (RFQs) & Supplier Quotation Comparison Matrix
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Scale, 
  Building2
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
import { DbRFQ } from '@/database/types';

export const RFQsView: React.FC<{
  onCreatePOFromQuotation?: (quotationId: string) => void;
}> = ({ onCreatePOFromQuotation }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRecordQuoteModalOpen, setIsRecordQuoteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<DbRFQ | null>(null);

  const rfqs = db.getRFQs(tenant);
  const suppliers = db.getSuppliers(tenant);
  const allQuotes = db.getSupplierQuotations(tenant);
  const purchaseRequests = db.getPurchaseRequests(tenant).filter((pr) => pr.status === 'approved');

  const [form, setForm] = useState({
    rfqNumber: `RFQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    requiredDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    deadlineDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    purchaseRequestId: purchaseRequests[0]?.id || '',
    invitedSupplierIds: suppliers.slice(0, 2).map((s) => s.id),
    notes: 'Please quote delivery lead times and payment terms.',
  });

  const [quoteForm, setQuoteForm] = useState({
    quotationNumber: `SQ-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: suppliers[0]?.id || '',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    paymentTermsDays: 30,
    deliveryLeadTimeDays: 7,
    unitPrice: '100.0000',
    quantity: '5',
    discountRate: '0',
    notes: 'Standard manufacturer warranty included.',
  });

  const handleCreateRFQ = () => {
    try {
      const pr = purchaseRequests.find((r) => r.id === form.purchaseRequestId);
      const items = pr?.items || [
        {
          id: 'rfq-item-1',
          description: 'Industrial Spare Parts & Consumables',
          quantity: '10',
          estimatedUnitPrice: '50.0000',
          estimatedTotal: '500.0000',
        },
      ];

      procurementService.createRFQ({
        rfqNumber: form.rfqNumber,
        date: new Date().toISOString().slice(0, 10),
        requiredDate: form.requiredDate,
        purchaseRequestId: form.purchaseRequestId || undefined,
        buyerName: tenant.userEmail.split('@')[0],
        invitedSupplierIds: form.invitedSupplierIds,
        deadlineDate: form.deadlineDate,
        notes: form.notes,
        status: 'draft',
        items,
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        rfqNumber: `RFQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        requiredDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        deadlineDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        purchaseRequestId: purchaseRequests[0]?.id || '',
        invitedSupplierIds: suppliers.slice(0, 2).map((s) => s.id),
        notes: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordQuote = () => {
    if (!selectedRFQ) return;
    try {
      const qty = parseFloat(quoteForm.quantity) || 1;
      const price = parseFloat(quoteForm.unitPrice) || 0;
      const sub = (qty * price).toFixed(4);

      procurementService.recordSupplierQuotation({
        rfqId: selectedRFQ.id,
        quotationNumber: quoteForm.quotationNumber,
        supplierId: quoteForm.supplierId,
        quotationDate: new Date().toISOString().slice(0, 10),
        validUntil: quoteForm.validUntil,
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        paymentTermsDays: Number(quoteForm.paymentTermsDays),
        deliveryLeadTimeDays: Number(quoteForm.deliveryLeadTimeDays),
        subtotal: sub,
        taxAmount: '0.0000',
        freightCharges: '0.0000',
        otherCharges: '0.0000',
        total: sub,
        isSelected: false,
        notes: quoteForm.notes,
        items: [
          {
            id: 'qi-1',
            description: selectedRFQ.items[0]?.description || 'Quoted Item',
            quantity: qty.toString(),
            unitPrice: price.toFixed(4),
            discountRate: quoteForm.discountRate,
            subtotal: sub,
            taxAmount: '0.0000',
            total: sub,
          },
        ],
      }, tenant);

      setIsRecordQuoteModalOpen(false);
      alert('Supplier quotation recorded successfully.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelectWinningQuote = (quotationId: string) => {
    if (!selectedRFQ) return;
    const reason = prompt('Enter selection reason (e.g. Lowest compliant commercial offer):') || 'Best value & shortest lead time';
    procurementService.selectWinningQuotation(selectedRFQ.id, quotationId, reason, tenant);
    setIsCompareModalOpen(false);
    onCreatePOFromQuotation?.(quotationId);
  };

  const filteredRFQs = rfqs.filter((r) => {
    return !searchQuery || 
      r.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search RFQs by number or buyer..."
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
          Create RFQ
        </Button>
      </div>

      {/* RFQ Register Table */}
      <Card
        title="Requests for Quotation (RFQs)"
        subtitle={`Soliciting vendor proposals and multi-supplier bid evaluation`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">RFQ #</th>
                <th className="px-5 py-3.5">Issue Date</th>
                <th className="px-5 py-3.5">Deadline</th>
                <th className="px-5 py-3.5">Invited Vendors</th>
                <th className="px-5 py-3.5 text-center">Bids Received</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredRFQs.map((rfq) => {
                const quotes = allQuotes.filter((q) => q.rfqId === rfq.id);
                return (
                  <tr key={rfq.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{rfq.rfqNumber}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{rfq.date}</td>
                    <td className="px-5 py-3.5 font-mono text-amber-400">{rfq.deadlineDate}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {rfq.invitedSupplierIds.length} Suppliers Invited
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-brand-400 font-mono font-bold">
                        {quotes.length} Quotes
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={rfq.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Plus className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedRFQ(rfq);
                            setIsRecordQuoteModalOpen(true);
                          }}
                        >
                          Record Bid
                        </Button>

                        <Button
                          variant="primary"
                          size="xs"
                          icon={<Scale className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedRFQ(rfq);
                            setIsCompareModalOpen(true);
                          }}
                        >
                          Compare Bids
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRFQs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No RFQs active. Click "+ Create RFQ" to invite vendors for bids.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create RFQ Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Request for Quotation (RFQ)"
        subtitle="Invite approved vendors to submit competitive price proposals."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRFQ}>
              Issue RFQ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="RFQ Number"
              value={form.rfqNumber}
              onChange={(e) => setForm({ ...form, rfqNumber: e.target.value })}
            />
            <Input
              label="Delivery Required By"
              type="date"
              value={form.requiredDate}
              onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
            />
            <Input
              label="Submission Deadline"
              type="date"
              value={form.deadlineDate}
              onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Invite Approved Suppliers:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              {suppliers.map((s) => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-900 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.invitedSupplierIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, invitedSupplierIds: [...form.invitedSupplierIds, s.id] });
                      } else {
                        setForm({ ...form, invitedSupplierIds: form.invitedSupplierIds.filter((id) => id !== s.id) });
                      }
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-brand-500"
                  />
                  <span>{s.name} ({s.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Record Supplier Quote Modal */}
      {selectedRFQ && (
        <Modal
          isOpen={isRecordQuoteModalOpen}
          onClose={() => setIsRecordQuoteModalOpen(false)}
          title={`Record Supplier Bid for ${selectedRFQ.rfqNumber}`}
          subtitle="Input received price quotation and delivery commitments."
          size="lg"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsRecordQuoteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRecordQuote}>
                Save Quotation
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Quotation Reference #"
                value={quoteForm.quotationNumber}
                onChange={(e) => setQuoteForm({ ...quoteForm, quotationNumber: e.target.value })}
              />
              <Select
                label="Supplier"
                options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                value={quoteForm.supplierId}
                onChange={(e) => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quoted Quantity"
                type="number"
                value={quoteForm.quantity}
                onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
              />
              <Input
                label="Unit Price ($)"
                type="number"
                value={quoteForm.unitPrice}
                onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
              />
              <Input
                label="Lead Time (Days)"
                type="number"
                value={quoteForm.deliveryLeadTimeDays.toString()}
                onChange={(e) => setQuoteForm({ ...quoteForm, deliveryLeadTimeDays: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Side-by-Side Quotation Comparison Modal */}
      {selectedRFQ && (
        <Modal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          title={`Quotation Comparison: ${selectedRFQ.rfqNumber}`}
          subtitle="Side-by-side evaluation matrix of price, lead time, and payment terms."
          size="xl"
          footer={
            <Button size="sm" variant="secondary" onClick={() => setIsCompareModalOpen(false)}>
              Close Comparison
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5">Quote #</th>
                    <th className="px-4 py-2.5">Lead Time</th>
                    <th className="px-4 py-2.5">Terms</th>
                    <th className="px-4 py-2.5 text-right">Total Quote</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {allQuotes
                    .filter((q) => q.rfqId === selectedRFQ.id)
                    .map((quote) => {
                      const sup = suppliers.find((s) => s.id === quote.supplierId);
                      return (
                        <tr key={quote.id} className={quote.isSelected ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'}>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-brand-400" />
                              <span>{sup?.name || 'Vendor'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{sup?.code}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-sky-400">{quote.quotationNumber}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">{quote.deliveryLeadTimeDays || '—'} Days</td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">Net {quote.paymentTermsDays}d</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">
                            ${parseFloat(quote.total).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {quote.isSelected ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                Awarded
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Under Review</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {!quote.isSelected && (
                              <Button
                                variant="primary"
                                size="xs"
                                icon={<CheckCircle2 className="w-3 h-3" />}
                                onClick={() => handleSelectWinningQuote(quote.id)}
                              >
                                Award & PO
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {allQuotes.filter((q) => q.rfqId === selectedRFQ.id).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No vendor bids recorded yet. Click "Record Bid" to log supplier quotes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
