// ============================================================================
// Supplier Payment Disbursements & Multi-Bill Allocation Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Building2 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { accountsPayableService } from '@/modules/procurement/services/ap.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { PaymentMethod, DbBillPaymentAllocation } from '@/database/types';

export const SupplierPaymentsView: React.FC<{
  initialSupplierId?: string;
  initialBillId?: string;
  onPaymentCreated?: () => void;
}> = ({ initialSupplierId, initialBillId, onPaymentCreated }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialBillId || !!initialSupplierId);

  const payments = db.getSupplierPayments(tenant);
  const suppliers = db.getSuppliers(tenant);
  const allBills = db.getSupplierBills(tenant).filter((b) => b.status === 'posted');
  const accounts = db.getAccounts(tenant);
  const bankAccounts = accounts.filter((a) => a.code.startsWith('10') || a.accountType === 'asset');

  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId || suppliers[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState('1000.0000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [paymentNumber, setPaymentNumber] = useState(`SPAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (initialBillId) {
      const b = allBills.find((bill) => bill.id === initialBillId);
      return b ? { [initialBillId]: b.balanceDue } : {};
    }
    return {};
  });

  const unpaidBills = allBills.filter(
    (b) => b.supplierId === selectedSupplierId && parseFloat(b.balanceDue) > 0
  );

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const payAmtNum = parseFloat(paymentAmount) || 0;
  const unallocatedAdvance = Math.max(0, payAmtNum - totalAllocated);

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    setAllocations({});
  };

  const handleAllocate = (billId: string, amountStr: string) => {
    setAllocations({
      ...allocations,
      [billId]: amountStr,
    });
  };

  const handleFullPay = (billId: string, balanceDue: string) => {
    setAllocations({
      ...allocations,
      [billId]: balanceDue,
    });
  };

  const handleDisbursePayment = () => {
    if (payAmtNum <= 0) {
      alert('Please enter a valid disbursement amount.');
      return;
    }

    try {
      const allocPayload: DbBillPaymentAllocation[] = Object.entries(allocations)
        .filter(([_, amt]) => parseFloat(amt) > 0)
        .map(([billId, amt]) => {
          const bill = allBills.find((b) => b.id === billId);
          return {
            billId,
            billNumber: bill?.billNumber || 'BILL',
            allocatedAmount: parseFloat(amt).toFixed(4),
          };
        });

      accountsPayableService.postSupplierPaymentWithAllocation({
        supplierId: selectedSupplierId,
        paymentNumber,
        paymentDate,
        paymentMethod,
        bankAccountId,
        amount: payAmtNum.toFixed(4),
        reference,
        notes: unallocatedAdvance > 0 ? `Includes $${unallocatedAdvance.toFixed(2)} Supplier Advance` : undefined,
        allocations: allocPayload,
      }, tenant);

      setIsCreateModalOpen(false);
      onPaymentCreated?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const sup = suppliers.find((s) => s.id === p.supplierId);
    return !searchQuery || 
      p.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payment # or supplier..."
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
          Disburse Supplier Payment
        </Button>
      </div>

      {/* Payments Register Table */}
      <Card
        title="Supplier Disbursements & Payment Register"
        subtitle={`Showing ${filteredPayments.length} recorded supplier payment transactions`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Payment #</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5 text-right">Disbursed Amount</th>
                <th className="px-5 py-3.5 text-right">Allocated</th>
                <th className="px-5 py-3.5 text-right">Advance Prepayment</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredPayments.map((p) => {
                const sup = suppliers.find((s) => s.id === p.supplierId);
                const allocSum = p.allocations.reduce((sum, a) => sum + parseFloat(a.allocatedAmount), 0);
                return (
                  <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">{p.paymentNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{sup?.name || 'Vendor'}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sup?.code}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{p.paymentDate}</td>
                    <td className="px-5 py-3.5 uppercase font-medium text-foreground/90">
                      {p.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                      ${parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-foreground/90">
                      ${allocSum.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-cyan-400">
                      {parseFloat(p.unallocatedAmount) > 0 ? `$${parseFloat(p.unallocatedAmount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Posted to GL
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No supplier disbursements recorded. Click "+ Disburse Supplier Payment" to log a payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disburse Payment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Disburse Supplier Payment"
        subtitle="Settle outstanding vendor invoices or record supplier advance prepayments."
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDisbursePayment}>
              Confirm Disbursement & Post to GL
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Payment Number"
              value={paymentNumber}
              onChange={(e) => setPaymentNumber(e.target.value)}
            />
            <Select
              label="Supplier"
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
            />
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Disbursement Amount ($)"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <Select
              label="Payment Method"
              options={[
                { value: 'bank_transfer', label: 'Electronic Bank Transfer' },
                { value: 'cheque', label: 'Commercial Cheque' },
                { value: 'cash', label: 'Petty Cash' },
                { value: 'card', label: 'Corporate Card' },
              ]}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            />
            <Select
              label="Disbursing Bank Account"
              options={bankAccounts.map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` }))}
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            />
            <Input
              label="Reference / Wire ID"
              placeholder="e.g. TRF-889911"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Unpaid Bills Allocation Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground/90">
                Allocate against Unpaid Bills ({unpaidBills.length} Open)
              </span>
              <span className="text-xs text-muted-foreground">
                Allocated: <strong className="text-emerald-400 font-mono">${totalAllocated.toFixed(2)}</strong> | Advance: <strong className="text-cyan-400 font-mono">${unallocatedAdvance.toFixed(2)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/80 text-muted-foreground font-semibold uppercase">
                    <th className="px-4 py-2">Bill #</th>
                    <th className="px-4 py-2">Vendor Ref</th>
                    <th className="px-4 py-2">Due Date</th>
                    <th className="px-4 py-2 text-right">Balance Due</th>
                    <th className="px-4 py-2 text-right">Allocate ($)</th>
                    <th className="px-4 py-2 text-right">Quick</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {unpaidBills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-4 py-2 font-mono text-sky-400">{bill.billNumber}</td>
                      <td className="px-4 py-2 text-foreground/90">{bill.supplierInvoiceNumber}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{bill.dueDate}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-amber-400">
                        ${parseFloat(bill.balanceDue).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={allocations[bill.id] || ''}
                          onChange={(e) => handleAllocate(bill.id, e.target.value)}
                          className="w-24 px-2 py-1 text-xs bg-card border border-border rounded text-foreground text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleFullPay(bill.id, bill.balanceDue)}
                        >
                          Pay Full
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {unpaidBills.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No outstanding unpaid bills for this supplier. Full amount will be recorded as a Supplier Advance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
