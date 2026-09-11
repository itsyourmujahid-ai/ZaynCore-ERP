// ============================================================================
// Procurement & Accounts Payable (AP) Master Workspace Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Truck, 
  Users, 
  FileText, 
  Plus, 
  CreditCard, 
  CheckCircle2,
  Boxes,
  RotateCcw,
  Scale,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { subLedgerService } from '@/modules/accounting/services/sub-ledger.service';
import { SupplierDirectoryView } from './SupplierDirectoryView';
import { PurchaseRequestsView } from './PurchaseRequestsView';
import { RFQsView } from './RFQsView';
import { PurchaseOrdersView } from './PurchaseOrdersView';
import { GoodsReceiptsView } from './GoodsReceiptsView';
import { SupplierBillsView } from './SupplierBillsView';
import { SupplierPaymentsView } from './SupplierPaymentsView';
import { SupplierCreditDebitNotesView } from './SupplierCreditDebitNotesView';
import { APAgingReportView } from './APAgingReportView';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';

export const PurchasesWorkspace: React.FC<{ onNavigateAccounting?: () => void }> = ({ onNavigateAccounting }) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [targetSupplierId, setTargetSupplierId] = useState<string | undefined>(undefined);
  const [targetPOId, setTargetPOId] = useState<string | undefined>(undefined);

  // Sub-ledger live reconciliation with GL #2010
  const apReconciliation = subLedgerService.reconcileSubLedger('supplier', tenant);
  const suppliers = db.getSuppliers(tenant);
  const bills = db.getSupplierBills(tenant);
  const pos = db.getPurchaseOrders(tenant);
  const payments = db.getSupplierPayments(tenant);

  const totalOutstanding = bills
    .filter((b) => b.status === 'posted')
    .reduce((sum, b) => sum + parseFloat(b.balanceDue), 0);

  const pendingPOs = pos.filter((p) => p.status === 'approved' || p.status === 'partially_received').length;

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'requests', label: 'Requests', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'rfqs', label: 'RFQs & Quotes', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'orders', label: `Orders (${pos.length})`, icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'receiving', label: 'Receiving (GRN)', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'bills', label: `Bills (${bills.length})`, icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'payments', label: `Payments (${payments.length})`, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'AP Aging Schedule',
      icon: <Calendar className="w-3.5 h-3.5 text-brand-400" />,
      onClick: () => setActiveTab('aging'),
    },
    {
      label: 'Supplier Returns & Credit Notes',
      icon: <RotateCcw className="w-3.5 h-3.5 text-rose-400" />,
      onClick: () => setActiveTab('adjustments'),
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Accounts Payable GL Sub-Ledger',
      icon: <CreditCard className="w-3.5 h-3.5 text-sky-400" />,
      onClick: () => onNavigateAccounting?.(),
    },
  ];

  const handleRecordBill = (supplierId?: string, poId?: string) => {
    setTargetSupplierId(supplierId);
    setTargetPOId(poId);
    setActiveTab('bills');
  };

  const handleRecordPayment = (supplierId?: string) => {
    setTargetSupplierId(supplierId);
    setActiveTab('payments');
  };

  const handleReceivePO = (poId: string) => {
    setTargetPOId(poId);
    setActiveTab('receiving');
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Procurement & AP', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || activeTab.toUpperCase(), isCurrent: true },
        ]}
      />

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Supply Chain & Accounts Payable</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Procurement & Accounts Payable</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vendor master, PR workflow, RFQ comparison, POs, 3-way matching, AP sub-ledger, and GL posting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => handleRecordBill()}
          >
            Record Bill
          </Button>

          <DropdownMenu
            label="More ▾"
            items={moreMenuItems}
            align="right"
          />
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-px gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setTargetSupplierId(undefined);
                  setTargetPOId(undefined);
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600 bg-card font-bold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
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

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Outstanding AP"
              value={`$${totalOutstanding.toFixed(2)}`}
              icon={<CreditCard className="w-5 h-5 text-sky-400" />}
              subtext="GL Account #2010"
            />
            <MetricCard
              label="Pending POs"
              value={`${pendingPOs} Orders`}
              icon={<Truck className="w-5 h-5 text-amber-400" />}
              subtext="Awaiting Receiving / Billing"
            />
            <MetricCard
              label="Approved Vendors"
              value={`${suppliers.length} Vendors`}
              icon={<Users className="w-5 h-5 text-purple-400" />}
              subtext="Credit terms & coordinates"
            />
            <MetricCard
              label="AP Sub-Ledger Sync"
              value={apReconciliation.isReconciled ? "100% In Sync" : "Out of Balance"}
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              subtext={`Variance: $${parseFloat(apReconciliation.variance).toFixed(2)}`}
            />
          </div>

          {/* Sub-Ledger Reconciliation & 3-Way Match Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Accounts Payable Sub-Ledger Reconciliation"
              subtitle="Real-time verification between AP Sub-Ledger entities and GL Account #2010"
            >
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-card/60 border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block">GL Control Account #2010:</span>
                    <strong className="text-foreground font-mono text-sm">${parseFloat(apReconciliation.glControlAccountBalance).toFixed(2)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block">AP Sub-Ledger Total:</span>
                    <strong className="text-brand-400 font-mono text-sm">${parseFloat(apReconciliation.subLedgerTotalBalance).toFixed(2)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block">Reconciliation Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      apReconciliation.isReconciled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {apReconciliation.isReconciled ? 'Zero Variance' : 'Variance Detected'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-card/80 text-muted-foreground font-semibold uppercase">
                        <th className="px-4 py-2">Supplier Entity</th>
                        <th className="px-4 py-2 text-right">Debit (Paid)</th>
                        <th className="px-4 py-2 text-right">Credit (Billed)</th>
                        <th className="px-4 py-2 text-right">Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {apReconciliation.entities.map((ent) => (
                        <tr key={ent.entityId}>
                          <td className="px-4 py-2 font-medium">{ent.entityName}</td>
                          <td className="px-4 py-2 text-right font-mono text-emerald-400">${parseFloat(ent.totalDebit).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-foreground">${parseFloat(ent.totalCredit).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-amber-400">${parseFloat(ent.netBalance).toFixed(2)}</td>
                        </tr>
                      ))}
                      {apReconciliation.entities.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                            No posted sub-ledger entries recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card
              title="3-Way Matching & Posting Pipeline"
              subtitle="Automated commercial verification sequence for Accounts Payable"
            >
              <div className="p-4 rounded-xl bg-card/60 border border-border text-xs text-foreground/90 space-y-3">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Scale className="w-4 h-4 text-brand-400" />
                  <span>3-Way Matching Rules & Tolerances:</span>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span><strong>Purchase Order vs Receiving Dock:</strong> Quantity check comparing ordered vs delivered items with rejection logs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span><strong>Receiving vs Supplier Bill:</strong> Quantity, unit price, and total verification within $\pm 5\%$ tolerance threshold.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span><strong>Automatic Accounting Posting:</strong> Debit Purchases/Expense (#5010) + Debit Input VAT (#1450) / Credit Accounts Payable Control (#2010).</span>
                  </li>
                </ul>

                <div className="pt-2 flex items-center gap-2">
                  <Button size="xs" variant="primary" onClick={() => setActiveTab('aging')}>
                    View AP Aging Schedule
                  </Button>
                  {onNavigateAccounting && (
                    <Button size="xs" variant="outline" onClick={onNavigateAccounting}>
                      Open General Ledger
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers */}
      {activeTab === 'suppliers' && (
        <SupplierDirectoryView
          onRecordBill={(supId) => handleRecordBill(supId)}
          onRecordPayment={(supId) => handleRecordPayment(supId)}
        />
      )}

      {/* Tab 3: Requests */}
      {activeTab === 'requests' && (
        <PurchaseRequestsView
          onCreateRFQFromPR={() => setActiveTab('rfqs')}
          onCreatePOFromPR={() => setActiveTab('orders')}
        />
      )}

      {/* Tab 4: RFQs */}
      {activeTab === 'rfqs' && (
        <RFQsView
          onCreatePOFromQuotation={() => setActiveTab('orders')}
        />
      )}

      {/* Tab 5: Orders */}
      {activeTab === 'orders' && (
        <PurchaseOrdersView
          onReceivePO={(poId) => handleReceivePO(poId)}
          onBillPO={(poId) => handleRecordBill(undefined, poId)}
        />
      )}

      {/* Tab 6: Receiving */}
      {activeTab === 'receiving' && (
        <GoodsReceiptsView
          initialPOId={targetPOId}
          onReceiptCreated={() => setActiveTab('orders')}
        />
      )}

      {/* Tab 7: Bills */}
      {activeTab === 'bills' && (
        <SupplierBillsView
          initialSupplierId={targetSupplierId}
          initialPOId={targetPOId}
          onPayBill={() => setActiveTab('payments')}
          onNavigateAccounting={onNavigateAccounting}
        />
      )}

      {/* Tab 8: Payments */}
      {activeTab === 'payments' && (
        <SupplierPaymentsView
          initialSupplierId={targetSupplierId}
        />
      )}

      {/* Secondary Tab: Aging */}
      {activeTab === 'aging' && (
        <APAgingReportView
          onRecordPayment={(supId) => handleRecordPayment(supId)}
        />
      )}

      {/* Secondary Tab: Adjustments */}
      {activeTab === 'adjustments' && (
        <SupplierCreditDebitNotesView />
      )}
    </div>
  );
};
