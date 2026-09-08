// ============================================================================
// Tax Payments & Refunds Workbench View (Treasury Banking Integration)
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { taxPaymentService } from '../services/tax-payment.service';
import { taxReturnService } from '../services/tax-return.service';
import { db } from '@/database/storage';

export const TaxPaymentsView: React.FC = () => {
  const { tenant } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    taxReturnId: '',
    bankAccountId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const [refundForm, setRefundForm] = useState({
    taxReturnId: '',
    bankAccountId: '',
    amount: '',
    receiptDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const returns = taxReturnService.getReturns(tenant);
  const payableReturns = returns.filter(
    (r) => (r.status === 'filed' || r.status === 'approved') && parseFloat(r.netTaxPayableOrRefundable) > 0 && r.paymentStatus !== 'paid'
  );
  const refundableReturns = returns.filter(
    (r) => (r.status === 'filed' || r.status === 'approved') && parseFloat(r.netTaxPayableOrRefundable) < 0 && r.paymentStatus !== 'refunded'
  );

  const bankAccounts = db.getBankAccounts(tenant);

  const handleDisbursePayment = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxPaymentService.disburseTaxPayment(
        {
          taxReturnId: paymentForm.taxReturnId,
          bankAccountId: paymentForm.bankAccountId || bankAccounts[0]?.id,
          amount: paymentForm.amount ? parseFloat(paymentForm.amount) : undefined,
          paymentDate: paymentForm.paymentDate,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
        },
        tenant
      );
      setIsPaymentModalOpen(false);
      setPaymentForm({
        taxReturnId: '',
        bankAccountId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReceiveRefund = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxPaymentService.receiveTaxRefund(
        {
          taxReturnId: refundForm.taxReturnId,
          bankAccountId: refundForm.bankAccountId || bankAccounts[0]?.id,
          amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
          receiptDate: refundForm.receiptDate,
          reference: refundForm.reference,
          notes: refundForm.notes,
        },
        tenant
      );
      setIsRefundModalOpen(false);
      setRefundForm({
        taxReturnId: '',
        bankAccountId: '',
        amount: '',
        receiptDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Tax Payments & Treasury Settlements</h2>
          <p className="text-xs text-slate-400">
            Execute payments to sovereign tax authorities and record incoming refund deposits with automatic GL and bank ledger sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={() => setIsRefundModalOpen(true)}
            disabled={refundableReturns.length === 0}
          >
            Record Tax Refund ({refundableReturns.length})
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={payableReturns.length === 0}
          >
            Disburse Tax Payment ({payableReturns.length})
          </Button>
        </div>
      </div>

      {/* PAYABLE RETURNS WAITING SETTLEMENT */}
      <Card
        title="Pending Tax Authority Liabilities"
        subtitle="Filed returns with outstanding payable balance awaiting bank remittance"
      >
        {payableReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Return #</th>
                  <th className="py-2.5 px-3">Filing Date</th>
                  <th className="py-2.5 px-3">Output Tax</th>
                  <th className="py-2.5 px-3">Recoverable Input</th>
                  <th className="py-2.5 px-3 text-right">Net Liability Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payableReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{r.returnNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{r.filingDate}</td>
                    <td className="py-2.5 px-3 font-mono text-sky-400">${parseFloat(r.totalOutputTax).toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">${parseFloat(r.totalRecoverableInputTax).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      ${parseFloat(r.netTaxPayableOrRefundable).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={r.paymentStatus} size="xs" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="primary"
                        size="xs"
                        icon={<CreditCard className="w-3 h-3" />}
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            taxReturnId: r.id,
                            amount: r.netTaxPayableOrRefundable,
                          });
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        Pay Now
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            No pending tax payments due. All filed returns are settled.
          </div>
        )}
      </Card>

      {/* ALL FILED RETURNS HISTORY */}
      <Card title="Tax Return Settlement Register" subtitle="Historical return filings, payments, and refunds">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Return #</th>
                <th className="py-2.5 px-3">Filing Date</th>
                <th className="py-2.5 px-3 text-right">Net Balance</th>
                <th className="py-2.5 px-3">Filing Status</th>
                <th className="py-2.5 px-3">Payment Status</th>
                <th className="py-2.5 px-3 text-center">Settlement Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {returns.map((r) => {
                const net = parseFloat(r.netTaxPayableOrRefundable);
                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{r.returnNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{r.filingDate}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                      net > 0 ? 'text-amber-400' : (net < 0 ? 'text-emerald-400' : 'text-slate-400')
                    }`}>
                      {net < 0 ? `($${Math.abs(net).toFixed(2)})` : `$${net.toFixed(2)}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={r.status} size="xs" />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={r.paymentStatus} size="xs" />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {r.settlementJournalId ? (
                        <span className="font-mono text-[11px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                          {r.settlementJournalId}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[10px]">Unsettled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL: DISBURSE TAX PAYMENT */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Disburse Tax Authority Payment"
        size="md"
      >
        <form onSubmit={handleDisbursePayment} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Select Filed Tax Return *</label>
            <select
              value={paymentForm.taxReturnId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const ret = payableReturns.find((r) => r.id === e.target.value);
                setPaymentForm({
                  ...paymentForm,
                  taxReturnId: e.target.value,
                  amount: ret ? ret.netTaxPayableOrRefundable : '',
                });
              }}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Return...</option>
              {payableReturns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.returnNumber} — Due: ${parseFloat(r.netTaxPayableOrRefundable).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Disbursing Bank Account *</label>
            <select
              value={paymentForm.bankAccountId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName} ({b.bankName}) — Bal: ${parseFloat(b.currentBalance).toFixed(2)} {b.currency}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Payment Amount *</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Payment Date *</label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Payment Reference</label>
            <input
              value={paymentForm.reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="e.g. EFT-OTA-2026-001"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Disburse Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECEIVE TAX REFUND */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Record Government Tax Refund Deposit"
        size="md"
      >
        <form onSubmit={handleReceiveRefund} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Select Refundable Tax Return *</label>
            <select
              value={refundForm.taxReturnId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const ret = refundableReturns.find((r) => r.id === e.target.value);
                setRefundForm({
                  ...refundForm,
                  taxReturnId: e.target.value,
                  amount: ret ? Math.abs(parseFloat(ret.netTaxPayableOrRefundable)).toFixed(2) : '',
                });
              }}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Return...</option>
              {refundableReturns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.returnNumber} — Refund Due: ${Math.abs(parseFloat(r.netTaxPayableOrRefundable)).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Receiving Bank Account *</label>
            <select
              value={refundForm.bankAccountId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRefundForm({ ...refundForm, bankAccountId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Bank Account...</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName} ({b.bankName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Refund Deposit Amount *</label>
              <input
                type="number"
                step="0.01"
                value={refundForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundForm({ ...refundForm, amount: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Deposit Date *</label>
              <input
                type="date"
                value={refundForm.receiptDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundForm({ ...refundForm, receiptDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Treasury Reference</label>
            <input
              value={refundForm.reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundForm({ ...refundForm, reference: e.target.value })}
              placeholder="e.g. OTA-REF-2026-99"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsRefundModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Refund Deposit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
