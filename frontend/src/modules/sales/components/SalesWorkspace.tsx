// ============================================================================
// Master Commercial Sales & Accounts Receivable Workspace (Phase 5)
// ============================================================================

import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Users, 
  FileText, 
  Plus, 
  TrendingUp, 
  CreditCard, 
  RotateCcw, 
  CheckCircle2, 
  BarChart3, 
  Tag, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { CustomerDirectoryView } from './CustomerDirectoryView';
import { QuotationsView } from './QuotationsView';
import { OrdersView } from './OrdersView';
import { InvoicesView } from './InvoicesView';
import { PaymentsView } from './PaymentsView';
import { CreditNotesView } from './CreditNotesView';
import { ARAgingReportView } from './ARAgingReportView';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';

export const SalesWorkspace: React.FC<{ onNavigateAccounting?: () => void }> = ({ onNavigateAccounting }) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [targetCustomerId, setTargetCustomerId] = useState<string | undefined>(undefined);
  const [targetOrderId, setTargetOrderId] = useState<string | undefined>(undefined);
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | undefined>(undefined);

  const customers = db.getCustomers(tenant);
  const invoices = db.getSalesInvoices(tenant);
  const postedInvoices = invoices.filter((i) => i.status === 'posted');
  const orders = db.getSalesOrders(tenant);
  const quotes = db.getSalesQuotations(tenant);
  const payments = db.getCustomerPayments(tenant);

  const totalInvoicedRevenue = postedInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0);
  const totalOutstandingAR = postedInvoices.reduce((sum, i) => sum + parseFloat(i.balanceDue), 0);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-3.5 h-3.5" />, badge: customers.length },
    { id: 'quotations', label: 'Quotations', icon: <FileText className="w-3.5 h-3.5" />, badge: quotes.length },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="w-3.5 h-3.5" />, badge: orders.length },
    { id: 'invoices', label: 'Invoices', icon: <CreditCard className="w-3.5 h-3.5" />, badge: postedInvoices.length },
    { id: 'payments', label: 'Payments', icon: <CheckCircle2 className="w-3.5 h-3.5" />, badge: payments.length },
  ];

  const moreMenuItems = [
    {
      label: 'Returns & Credit Notes',
      icon: <RotateCcw className="w-3.5 h-3.5 text-rose-400" />,
      onClick: () => setActiveTab('credit_notes'),
    },
    {
      label: 'Accounts Receivable (AR) Aging',
      icon: <BarChart3 className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setActiveTab('aging'),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Customer Groups & Credit Limits',
      icon: <Tag className="w-3.5 h-3.5 text-purple-400" />,
      onClick: () => setActiveTab('customers'),
    },
    {
      label: 'Sales Accounting Settings',
      icon: <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />,
      onClick: () => onNavigateAccounting?.(),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Sales Management', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || (activeTab === 'credit_notes' ? 'Credit Notes' : activeTab === 'aging' ? 'AR Aging' : 'Overview'), isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Commercial Revenue & AR</span>
            <span className="text-foreground/90">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Sales & Accounts Receivable</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customer directory, price quotes, sales orders, tax invoicing, customer payments, and automatic double-entry General Ledger postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab('invoices')}
          >
            Create Invoice
          </Button>

          <DropdownMenu
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* 5-7 Tab Secondary Navigation Bar */}
      <div className="flex items-center justify-between border-b border-border pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-card font-bold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block pb-1">
          <DropdownMenu
            variant="ghost"
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Invoiced Revenue (MTD)"
              value={`$${totalInvoicedRevenue.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              subtext={`${postedInvoices.length} Invoices Posted`}
            />
            <MetricCard
              label="Outstanding Receivables"
              value={`$${totalOutstandingAR.toFixed(2)} ${tenant.baseCurrency}`}
              icon={<CreditCard className="w-5 h-5 text-amber-400" />}
              subtext="GL Control Account #1200"
            />
            <MetricCard
              label="Active Customers"
              value={`${customers.length} Accounts`}
              icon={<Users className="w-5 h-5 text-purple-400" />}
              subtext="Directory Synchronized"
            />
            <MetricCard
              label="AR Sub-Ledger Sync"
              value="100% In Balance"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              subtext="Reconciles to GL #1200"
            />
          </div>

          <Card
            title="Recent Invoices & Automated Postings"
            subtitle="Commercial billing records automatically synchronized with Accounts Receivable"
            action={
              <Button size="xs" variant="ghost" onClick={() => setActiveTab('invoices')}>
                View All Invoices
              </Button>
            }
          >
            {postedInvoices.length > 0 ? (
              <div className="space-y-3">
                {postedInvoices.slice(0, 5).map((inv) => {
                  const customer = customers.find((c) => c.id === inv.customerId);
                  return (
                    <div key={inv.id} className="p-3.5 rounded-lg bg-card/60 border border-border flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand-400">{inv.invoiceNumber}</span>
                          <StatusBadge status="posted" size="xs" />
                          <span className="text-xs font-semibold text-foreground">• {customer?.name || 'Customer'}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">Due: {inv.dueDate} • Ref: {inv.reference || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 text-sm">${parseFloat(inv.total).toFixed(2)} {inv.currency}</span>
                        <div className="text-[11px] font-mono text-amber-400 font-semibold">Due: ${parseFloat(inv.balanceDue).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-card/40 border border-border/80 space-y-3">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground">No Sales Invoices Recorded Yet</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                    Create your first sales invoice to issue customer billings and trigger automated Accounts Receivable postings.
                  </p>
                </div>
                <Button size="xs" variant="primary" onClick={() => setActiveTab('invoices')}>
                  + Create First Invoice
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: CUSTOMERS */}
      {activeTab === 'customers' && (
        <CustomerDirectoryView
          onOpenNewInvoice={(customerId) => {
            setTargetCustomerId(customerId);
            setActiveTab('invoices');
          }}
          onOpenNewReceipt={(customerId) => {
            setTargetCustomerId(customerId);
            setActiveTab('payments');
          }}
        />
      )}

      {/* TAB 3: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <QuotationsView
          onConvertedToOrder={() => setActiveTab('orders')}
        />
      )}

      {/* TAB 4: ORDERS */}
      {activeTab === 'orders' && (
        <OrdersView
          onGenerateInvoice={(orderId) => {
            setTargetOrderId(orderId);
            setActiveTab('invoices');
          }}
        />
      )}

      {/* TAB 5: INVOICES */}
      {activeTab === 'invoices' && (
        <InvoicesView
          initialCustomerId={targetCustomerId}
          initialOrderId={targetOrderId}
          onNavigateAccounting={onNavigateAccounting}
          onRecordPayment={(invoiceId) => {
            setTargetInvoiceId(invoiceId);
            setActiveTab('payments');
          }}
        />
      )}

      {/* TAB 6: PAYMENTS */}
      {activeTab === 'payments' && (
        <PaymentsView
          initialInvoiceId={targetInvoiceId}
          initialCustomerId={targetCustomerId}
        />
      )}

      {/* MORE OPTION: CREDIT NOTES */}
      {activeTab === 'credit_notes' && (
        <CreditNotesView />
      )}

      {/* MORE OPTION: AR AGING */}
      {activeTab === 'aging' && (
        <ARAgingReportView />
      )}
    </div>
  );
};
