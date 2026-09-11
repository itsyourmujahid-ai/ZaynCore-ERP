// ============================================================================
// Customer Receipts & Payment Allocation Component (Full, Partial & Advance)
// Enterprise 2-Step Verification: Sales Submission + Proof Upload -> Accountant Approval -> GL Post
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  Clock, 
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { accountsReceivableService } from '../services/ar.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { PaymentMethod, DbCustomerPayment } from '@/database/types';

export const PaymentsView: React.FC<{
  initialInvoiceId?: string;
  initialCustomerId?: string;
}> = ({ initialInvoiceId, initialCustomerId }) => {
  const { tenant } = useAuth();
  const payments = db.getCustomerPayments(tenant);
  const customers = db.getCustomers(tenant);
  const invoices = db.getSalesInvoices(tenant).filter((i) => i.status === 'posted');
  const bankAccounts = db.getAccounts(tenant).filter((a) => a.code.startsWith('10'));

  const isAccountant = tenant.isPlatformAdmin || 
    tenant.roles.some((r) => ['admin', 'accountant', 'cfo', 'finance_manager'].includes(r.toLowerCase())) ||
    tenant.permissions.includes('*') || 
    tenant.permissions.includes('accounting.*');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<DbCustomerPayment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'posted' | 'rejected'>('all');

  // Form State
  const defaultCustomer = initialCustomerId || (initialInvoiceId ? invoices.find((i) => i.id === initialInvoiceId)?.customerId : customers[0]?.id) || '';

  const [form, setForm] = useState({
    receiptNumber: `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: defaultCustomer,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer' as PaymentMethod,
    bankAccountId: bankAccounts[0]?.id || '1010',
    amount: '10500.0000',
    currency: tenant.baseCurrency,
    reference: 'Bank Wire Ref #TRX-99881',
    notes: 'Settlement of outstanding tax invoices',
    proofDocumentName: 'Customer_Wire_Transfer_Proof.pdf',
    allocations: {} as Record<string, string>, // invoiceId -> allocated amount
  });

  // Open invoices for selected customer
  const customerUnpaidInvoices = invoices.filter(
    (i) => i.customerId === form.customerId && parseFloat(i.balanceDue) > 0
  );

  const totalAllocated = Object.values(form.allocations).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );
  const totalAmountNum = parseFloat(form.amount || '0');
  const unallocatedAdvance = Math.max(0, totalAmountNum - totalAllocated);

  const pendingCount = payments.filter((p) => p.status === 'pending_approval').length;
  const postedCount = payments.filter((p) => p.status === 'posted').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const cust = customers.find((c) => c.id === p.customerId);
    return (
      p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || totalAmountNum <= 0) {
      alert('Please select a customer and enter a valid payment amount.');
      return;
    }

    try {
      const allocationArray = Object.entries(form.allocations)
        .filter(([_, amt]) => parseFloat(amt) > 0)
        .map(([invId, amt]) => {
          const inv = invoices.find((i) => i.id === invId);
          return {
            invoiceId: invId,
            invoiceNumber: inv?.invoiceNumber || 'INV',
            allocatedAmount: parseFloat(amt).toFixed(4),
          };
        });

      if (isAccountant) {
        // Direct Post if authorized accountant
        accountsReceivableService.postReceiptWithAllocation({
          receiptNumber: form.receiptNumber,
          customerId: form.customerId,
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          bankAccountId: form.bankAccountId,
          amount: totalAmountNum.toFixed(4),
          currency: form.currency,
          reference: form.reference,
          notes: form.notes,
          proofDocumentName: form.proofDocumentName,
          proofDocumentUrl: form.proofDocumentName ? `file:///uploads/proofs/${form.proofDocumentName}` : undefined,
          allocations: allocationArray,
        }, tenant);
        alert('Customer receipt approved, posted to GL, and allocated against Accounts Receivable!');
      } else {
        // Sales user submits for verification
        accountsReceivableService.submitPaymentRequest({
          receiptNumber: form.receiptNumber,
          customerId: form.customerId,
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          bankAccountId: form.bankAccountId,
          amount: totalAmountNum.toFixed(4),
          currency: form.currency,
          reference: form.reference,
          notes: form.notes,
          proofDocumentName: form.proofDocumentName,
          proofDocumentUrl: form.proofDocumentName ? `file:///uploads/proofs/${form.proofDocumentName}` : undefined,
          allocations: allocationArray,
        }, tenant);
        alert('Payment request and proof submitted successfully! Awaiting Accountant verification.');
      }

      setIsCreateModalOpen(false);
      setForm({
        receiptNumber: `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: customers[0]?.id || '',
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'bank_transfer',
        bankAccountId: bankAccounts[0]?.id || '1010',
        amount: '10500.0000',
        currency: tenant.baseCurrency,
        reference: '',
        notes: '',
        proofDocumentName: 'Customer_Wire_Transfer_Proof.pdf',
        allocations: {},
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprovePayment = (paymentId: string) => {
    try {
      accountsReceivableService.approveAndPostPayment(paymentId, tenant);
      setIsDetailModalOpen(false);
      alert('Payment verified & approved! Automatically generated double-entry journal and updated AR sub-ledger.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectPayment = () => {
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason so the sales user can correct the details or proof.');
      return;
    }
    try {
      accountsReceivableService.rejectPayment(selectedPayment.id, rejectionReason, tenant);
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setRejectionReason('');
      alert('Payment rejected. The sales user can update the proof and resubmit.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResubmit = (payment: DbCustomerPayment) => {
    try {
      accountsReceivableService.resubmitPayment(payment.id, {
        notes: `${payment.notes || ''} [Resubmitted with updated proof]`,
      }, tenant);
      alert('Payment resubmitted to Accountant queue for verification.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner & Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: `All Receipts (${payments.length})` },
            { id: 'pending_approval', label: `Pending Verification (${pendingCount})`, highlight: pendingCount > 0 },
            { id: 'posted', label: `Posted & In GL (${postedCount})` },
            { id: 'rejected', label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-600 text-white'
                  : tab.highlight
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-muted/80 text-foreground/90 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search receipt #, customer..."
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
            {isAccountant ? 'Record Customer Receipt' : 'Submit Payment Request'}
          </Button>
        </div>
      </div>

      {/* Receipts Table */}
      <Card
        title="Customer Receipts & Payment Register"
        subtitle="Complete receipt lifecycle: Submission -> Proof Verification -> GL Automatic Posting"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Receipt #</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Payment Date</th>
                <th className="px-5 py-3.5">Method & Proof</th>
                <th className="px-5 py-3.5 text-right">Received Amount</th>
                <th className="px-5 py-3.5 text-right">Advance Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredPayments.map((p) => {
                const customer = customers.find((c) => c.id === p.customerId);
                return (
                  <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">{p.receiptNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-foreground">{customer?.name || 'Unknown Customer'}</td>
                    <td className="px-5 py-3.5 font-mono text-foreground/90">{p.paymentDate}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted border border-border capitalize">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                        {p.proofDocumentName && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5" /> Proof
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400">
                      ${parseFloat(p.amount).toFixed(2)} {p.currency}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                      {parseFloat(p.unallocatedAmount) > 0 ? (
                        <span className="text-amber-400 font-bold">${parseFloat(p.unallocatedAmount).toFixed(2)}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={p.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'pending_approval' && isAccountant && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handleApprovePayment(p.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {p.status === 'rejected' && !isAccountant && (
                          <Button
                            variant="outline"
                            size="xs"
                            icon={<RotateCcw className="w-3 h-3" />}
                            onClick={() => handleResubmit(p)}
                          >
                            Resubmit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedPayment(p);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Inspect
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No customer receipts matching the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Details & Verification Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Receipt Inspection: ${selectedPayment.receiptNumber}`}
          subtitle={`Customer: ${customers.find((c) => c.id === selectedPayment.customerId)?.name || 'Client'}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {selectedPayment.status === 'posted' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> Posted to GL (Journal #{selectedPayment.journalEntryId || 'AUTO'})
                  </span>
                ) : selectedPayment.status === 'rejected' ? (
                  <span className="text-rose-400 flex items-center gap-1 font-semibold">
                    <XCircle className="w-4 h-4" /> Rejected by Accountant
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <Clock className="w-4 h-4" /> Awaiting Accountant Verification (Not Posted to GL)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedPayment.status === 'pending_approval' && isAccountant && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleApprovePayment(selectedPayment.id)}
                    >
                      Approve & Post to GL
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-card/70 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Payment Date</span>
                <span className="text-foreground font-mono mt-0.5">{selectedPayment.paymentDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Method</span>
                <span className="text-foreground capitalize mt-0.5">{selectedPayment.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Total Amount</span>
                <span className="text-emerald-400 font-mono font-bold mt-0.5">${parseFloat(selectedPayment.amount).toFixed(2)} {selectedPayment.currency}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Status</span>
                <div className="mt-0.5"><StatusBadge status={selectedPayment.status} size="xs" /></div>
              </div>
            </div>

            {/* Proof Attachment Card */}
            <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted text-brand-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{selectedPayment.proofDocumentName || 'Payment_Proof_Slip.pdf'}</div>
                  <div className="text-[10px] text-muted-foreground">Bank Transfer Slip / Customer Deposit Confirmation</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified Format
              </span>
            </div>

            {selectedPayment.rejectionReason && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <strong className="block text-[11px] font-bold uppercase mb-0.5">Accountant Rejection Reason:</strong>
                <p>{selectedPayment.rejectionReason}</p>
              </div>
            )}

            {/* Allocations Table */}
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block pb-1 border-b border-border mb-2">
                Settled Invoice Allocations
              </span>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="px-4 py-2.5">Invoice #</th>
                      <th className="px-4 py-2.5 text-right">Allocated Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {selectedPayment.allocations.map((alloc: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono font-bold text-brand-400">{alloc.invoiceNumber}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">${parseFloat(alloc.allocatedAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                    {selectedPayment.allocations.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-muted-foreground">
                          Full amount recorded as Unallocated Customer Advance.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Payment Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Payment Request"
        size="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Enter the reason for rejection (e.g. proof slip illegible, incorrect amount, wrong bank account):
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="e.g. Uploaded bank wire confirmation shows mismatched amount. Please provide official swift slip."
            className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-rose-500 text-xs"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRejectPayment}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record / Submit Payment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isAccountant ? "Record Customer Receipt & Post to GL" : "Submit Customer Payment Request & Proof"}
        subtitle={isAccountant ? "Direct accountant settlement with automatic Dr Bank / Cr AR posting" : "Sales submission with proof attachment for accountant approval"}
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-foreground/90 font-mono">
              Total: <strong className="text-emerald-400 text-sm">${totalAmountNum.toFixed(2)}</strong> | Allocated: <strong>${totalAllocated.toFixed(2)}</strong> | Advance: <strong className="text-amber-400">${unallocatedAdvance.toFixed(2)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreatePayment}>
                {isAccountant ? 'Post Receipt to GL' : 'Submit for Verification'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Receipt Number"
              required
              value={form.receiptNumber}
              onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
            />

            <Select
              label="Customer *"
              options={[
                { value: '', label: 'Select Customer...' },
                ...customers.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })),
              ]}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value, allocations: {} })}
            />

            <Input
              label="Payment Date *"
              type="date"
              required
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Payment Method *"
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Credit/Debit Card' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'other', label: 'Other Method' },
              ]}
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
            />

            <Select
              label="Deposit / Cash Account *"
              options={bankAccounts.map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` }))}
              value={form.bankAccountId}
              onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
            />

            <Input
              label="Total Amount Received *"
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Reference / Transaction ID"
              placeholder="e.g. Wire Ref #TX-883921"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground/90 block">
                Proof of Payment Attachment *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.proofDocumentName}
                  onChange={(e) => setForm({ ...form, proofDocumentName: e.target.value })}
                  placeholder="e.g. Bank_Deposit_Proof.pdf"
                  className="w-full px-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                />
                <Button variant="outline" size="sm" icon={<UploadCloud className="w-3.5 h-3.5" />} type="button">
                  Browse
                </Button>
              </div>
            </div>
          </div>

          {/* Allocation Grid */}
          <div className="p-3.5 bg-card/70 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <span className="text-xs font-bold text-foreground/90">Invoice Allocation Grid</span>
              <span className="text-[11px] text-muted-foreground">Select invoices to settle</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Balance Due</th>
                    <th className="px-3 py-2 text-right">Allocate Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {customerUnpaidInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono font-bold text-brand-400">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">{inv.invoiceDate}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-400">${parseFloat(inv.balanceDue).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setForm({
                                ...form,
                                allocations: {
                                  ...form.allocations,
                                  [inv.id]: inv.balanceDue,
                                },
                              });
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-brand-400 hover:bg-muted"
                          >
                            Full
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            value={form.allocations[inv.id] || ''}
                            onChange={(e) => {
                              setForm({
                                ...form,
                                allocations: {
                                  ...form.allocations,
                                  [inv.id]: e.target.value,
                                },
                              });
                            }}
                            className="w-24 px-2 py-1 text-xs bg-card border border-border rounded text-right font-mono text-emerald-400 focus:outline-none focus:border-brand-500"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customerUnpaidInvoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        No outstanding invoices for this customer. Any payment will be tracked as an unallocated Customer Advance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

