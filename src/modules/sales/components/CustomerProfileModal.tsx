// ============================================================================
// Comprehensive Customer Profile Modal (Overview, Invoices, Payments, Statement)
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
import { accountsReceivableService } from '../services/ar.service';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';

export interface CustomerProfileModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenNewInvoice?: (customerId: string) => void;
  onOpenNewReceipt?: (customerId: string) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onOpenNewInvoice,
  onOpenNewReceipt,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'statement'>('overview');

  if (!customerId || !isOpen) return null;

  const customer = db.getCustomerById(customerId, tenant);
  if (!customer) return null;

  const creditSummary = accountsReceivableService.getCustomerCreditSummary(customer.id, tenant);
  const statement = accountsReceivableService.getCustomerStatement(customer.id, undefined, tenant);
  const invoices = db.getSalesInvoices(tenant).filter((i) => i.customerId === customer.id);
  const payments = db.getCustomerPayments(tenant).filter((p) => p.customerId === customer.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${customer.name} (${customer.code})`}
      subtitle={`Customer Type: ${customer.customerType.toUpperCase()} • Currency: ${customer.currency || tenant.baseCurrency}`}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          <div className="text-xs text-muted-foreground">
            Payment Terms: <strong>Net {customer.paymentTermsDays} Days</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenNewReceipt?.(customer.id);
              }}
            >
              Record Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenNewInvoice?.(customer.id);
              }}
            >
              + Create Invoice
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-px">
          {[
            { id: 'overview', label: 'Overview & Credit' },
            { id: 'invoices', label: `Invoices (${invoices.length})` },
            { id: 'payments', label: `Receipts (${payments.length})` },
            { id: 'statement', label: 'Statement of Account' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 select-none ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400 bg-card/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Credit Control Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Credit Limit</span>
                <div className="text-base font-mono font-bold text-foreground mt-0.5">
                  ${parseFloat(creditSummary.creditLimit).toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">Approved Ceiling</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] uppercase font-bold text-amber-400">Outstanding Balance</span>
                <div className="text-base font-mono font-bold text-amber-400 mt-0.5">
                  ${parseFloat(creditSummary.outstandingBalance).toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">Current AR Sub-Ledger</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Available Credit</span>
                <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                  ${parseFloat(creditSummary.availableCredit).toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">Remaining Limit</span>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-[10px] uppercase font-bold text-rose-400">Overdue Balance</span>
                <div className="text-base font-mono font-bold text-rose-400 mt-0.5">
                  ${parseFloat(creditSummary.overdueAmount).toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">Past Due Date</span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-4 rounded-xl bg-card/60 border border-border text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block pb-1 border-b border-border">
                Contact & Billing Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-foreground/90">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{customer.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{customer.phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{customer.addressLine1 ? `${customer.addressLine1}, ${customer.city || ''}` : 'No address'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Tax ID: {customer.taxIdentifier || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Due Date</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Balance Due</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono font-bold text-brand-400">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5 text-foreground/90 font-mono">{inv.invoiceDate}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{inv.dueDate}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">${parseFloat(inv.total).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400">${parseFloat(inv.balanceDue).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={inv.status} size="xs" /></td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No invoices recorded for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Receipt #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Unallocated Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">{p.receiptNumber}</td>
                    <td className="px-4 py-2.5 text-foreground/90 font-mono">{p.paymentDate}</td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{p.paymentMethod.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">${parseFloat(p.amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {parseFloat(p.unallocatedAmount) > 0 ? `$${parseFloat(p.unallocatedAmount).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No receipts recorded for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: STATEMENT */}
        {activeTab === 'statement' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border">
              <span>Statement of Account (Chronological AR Ledger)</span>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="outline" icon={<Printer className="w-3 h-3" />} onClick={() => window.print()}>
                  Print
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Reference #</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Debit (Invoices)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Receipts)</th>
                    <th className="px-4 py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {statement.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-foreground/90">{tx.date}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-brand-400">{tx.documentNumber}</td>
                      <td className="px-4 py-2.5 text-foreground/90">{tx.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                        {parseFloat(tx.debit) > 0 ? `$${parseFloat(tx.debit).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sky-400">
                        {parseFloat(tx.credit) > 0 ? `$${parseFloat(tx.credit).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        ${parseFloat(tx.runningBalance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {statement.transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No transactions recorded. Customer statement is clean ($0.00).
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-card/90 font-bold border-t border-border text-foreground">
                    <td colSpan={5} className="px-4 py-2.5 text-right uppercase tracking-wider">Closing Balance Due:</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400">
                      ${parseFloat(statement.closingBalance).toFixed(4)} {customer.currency || tenant.baseCurrency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
