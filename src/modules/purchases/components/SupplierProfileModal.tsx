// ============================================================================
// Comprehensive Supplier Profile Modal (Overview, Bills, Payments, Statement)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Printer, 
  Phone, 
  Mail, 
  MapPin
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { accountsPayableService } from '@/modules/procurement/services/ap.service';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';

export interface SupplierProfileModalProps {
  supplierId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenNewBill?: (supplierId: string) => void;
  onOpenNewPayment?: (supplierId: string) => void;
}

export const SupplierProfileModal: React.FC<SupplierProfileModalProps> = ({
  supplierId,
  isOpen,
  onClose,
  onOpenNewBill,
  onOpenNewPayment,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'payments' | 'orders' | 'statement'>('overview');

  if (!supplierId || !isOpen) return null;

  const supplier = db.getSupplierById(supplierId, tenant);
  if (!supplier) return null;

  const creditSummary = accountsPayableService.getSupplierCreditSummary(supplier.id, tenant);
  const statement = accountsPayableService.getSupplierStatement(supplier.id, undefined, tenant);
  const bills = db.getSupplierBills(tenant).filter((b) => b.supplierId === supplier.id);
  const payments = db.getSupplierPayments(tenant).filter((p) => p.supplierId === supplier.id);
  const pos = db.getPurchaseOrders(tenant).filter((po) => po.supplierId === supplier.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${supplier.name} (${supplier.code})`}
      subtitle={`Supplier Type: ${supplier.supplierType.toUpperCase()} • Currency: ${supplier.currency || tenant.baseCurrency}`}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          <div className="text-xs text-slate-400">
            Payment Terms: <strong>Net {supplier.paymentTermsDays} Days</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenNewPayment?.(supplier.id);
              }}
            >
              Disburse Payment
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenNewBill?.(supplier.id);
              }}
            >
              + Record Bill
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-px overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Credit' },
            { id: 'bills', label: `Bills (${bills.length})` },
            { id: 'payments', label: `Payments (${payments.length})` },
            { id: 'orders', label: `Orders (${pos.length})` },
            { id: 'statement', label: 'Statement of Account' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all select-none whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-brand-500 text-brand-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Credit Summary */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Dynamic Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Total Billed</span>
                <div className="text-lg font-bold text-slate-100 mt-0.5">${parseFloat(creditSummary.totalBilled).toFixed(2)}</div>
                <span className="text-[10px] text-slate-500">{bills.length} Invoices</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Total Paid</span>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">${parseFloat(creditSummary.totalPaid).toFixed(2)}</div>
                <span className="text-[10px] text-slate-500">{payments.length} Payments</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Outstanding AP</span>
                <div className="text-lg font-bold text-amber-400 mt-0.5">${parseFloat(creditSummary.outstandingBalance).toFixed(2)}</div>
                <span className="text-[10px] text-slate-500">{creditSummary.unpaidBillsCount} Unpaid</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Overdue AP</span>
                <div className="text-lg font-bold text-rose-400 mt-0.5">${parseFloat(creditSummary.overdueAmount).toFixed(2)}</div>
                <span className="text-[10px] text-slate-500">Exceeded Terms</span>
              </div>
            </div>

            {/* Supplier Details & Banking Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-400" />
                  <span>Contact Information</span>
                </div>
                <div className="space-y-1 text-slate-400">
                  <p><strong className="text-slate-300">Contact:</strong> {supplier.contactPerson || 'N/A'}</p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-500" /> {supplier.email || 'N/A'}</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" /> {supplier.phone || 'N/A'}</p>
                  <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-500" /> {supplier.addressLine1 || 'N/A'}, {supplier.city} ({supplier.countryCode})</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>Banking & Tax Details</span>
                </div>
                <div className="space-y-1 text-slate-400">
                  <p><strong className="text-slate-300">Tax / VAT ID:</strong> <span className="font-mono text-slate-200">{supplier.taxIdentifier || 'N/A'}</span></p>
                  <p><strong className="text-slate-300">Bank Name:</strong> {supplier.bankDetails?.bankName || 'N/A'}</p>
                  <p><strong className="text-slate-300">Account #:</strong> <span className="font-mono text-slate-200">{supplier.bankDetails?.accountNumber || 'N/A'}</span></p>
                  <p><strong className="text-slate-300">IBAN / SWIFT:</strong> <span className="font-mono text-slate-200">{supplier.bankDetails?.iban || supplier.bankDetails?.swiftCode || 'N/A'}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bills */}
        {activeTab === 'bills' && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                  <th className="px-4 py-2.5">Bill #</th>
                  <th className="px-4 py-2.5">Supplier Invoice #</th>
                  <th className="px-4 py-2.5">Bill Date</th>
                  <th className="px-4 py-2.5">Due Date</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Balance Due</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono font-bold text-brand-400">{b.billNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-300">{b.supplierInvoiceNumber}</td>
                    <td className="px-4 py-2.5 text-slate-400">{b.billDate}</td>
                    <td className="px-4 py-2.5 text-slate-400">{b.dueDate}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">${parseFloat(b.total).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400">${parseFloat(b.balanceDue).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={b.status} size="xs" /></td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No bills recorded for this supplier.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Payments */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                  <th className="px-4 py-2.5">Payment #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Allocated</th>
                  <th className="px-4 py-2.5 text-right">Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {payments.map((p) => {
                  const allocSum = p.allocations.reduce((sum, a) => sum + parseFloat(a.allocatedAmount), 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">{p.paymentNumber}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.paymentDate}</td>
                      <td className="px-4 py-2.5 uppercase text-slate-300">{p.paymentMethod.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">${parseFloat(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">${allocSum.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-cyan-400">${parseFloat(p.unallocatedAmount).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No payment disbursements recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Purchase Orders */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                  <th className="px-4 py-2.5">PO #</th>
                  <th className="px-4 py-2.5">PO Date</th>
                  <th className="px-4 py-2.5">Items</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono font-bold text-sky-400">{po.poNumber}</td>
                    <td className="px-4 py-2.5 text-slate-400">{po.poDate}</td>
                    <td className="px-4 py-2.5 text-slate-300">{po.items.length} line item(s)</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">${parseFloat(po.total).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={po.status} size="xs" /></td>
                  </tr>
                ))}
                {pos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No purchase orders created.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Statement of Account */}
        {activeTab === 'statement' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-200">Official Supplier Statement of Account</span>
              </div>
              <div className="font-mono text-xs">
                <span>Closing Balance: </span>
                <strong className="text-amber-400">${parseFloat(statement.closingBalance).toFixed(2)} {statement.currency}</strong>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Document #</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Debit (Payment/Credit)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Bill/Payable)</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {statement.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-slate-400">{line.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-300">{line.type}</td>
                      <td className="px-4 py-2.5 font-mono text-brand-400">{line.reference}</td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">{line.memo}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                        {parseFloat(line.debit) > 0 ? `$${parseFloat(line.debit).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-200">
                        {parseFloat(line.credit) > 0 ? `$${parseFloat(line.credit).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400">
                        ${parseFloat(line.runningBalance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {statement.lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No account activity recorded for this supplier.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
