// ============================================================================
// Inventory Sub-Ledger & GRNI Live Reconciliation Component
// ============================================================================

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Layers, 
  FileCheck2, 
  DollarSign 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { subLedgerService } from '@/modules/accounting/services/sub-ledger.service';
import { inventoryValuationService } from '@/modules/inventory/services/inventory-valuation.service';
import { Card } from '@/ui/components/Card';
import { MetricCard } from '@/ui/data-display/MetricCard';

export const InventoryReconciliationView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory_gl' | 'grni'>('inventory_gl');

  // Sub-Ledger vs GL Account #1300 Reconciliation
  const inventoryReconciliation = subLedgerService.reconcileSubLedger('inventory_item', tenant);

  // GRNI Clearing Report
  const grniReport = inventoryValuationService.getGRNIReconciliation(tenant);

  return (
    <div className="space-y-4">
      {/* Top Reconciliation Status Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="GL Account #1300 Balance"
          value={`$${parseFloat(inventoryReconciliation.glControlAccountBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tenant.baseCurrency}`}
          icon={<DollarSign className="w-4 h-4 text-brand-400" />}
          subtext="General Ledger Inventory Asset"
        />
        <MetricCard
          label="Inventory Sub-Ledger Total"
          value={`$${parseFloat(inventoryReconciliation.subLedgerTotalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tenant.baseCurrency}`}
          icon={<Layers className="w-4 h-4 text-emerald-400" />}
          subtext="Perpetual Material Ledger Value"
        />
        <MetricCard
          label="Reconciliation Variance"
          value={`$${parseFloat(inventoryReconciliation.variance).toFixed(4)}`}
          icon={inventoryReconciliation.isReconciled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          subtext={inventoryReconciliation.isReconciled ? 'Zero Variance (100% In Balance)' : 'Discrepancy Detected'}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('inventory_gl')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'inventory_gl'
              ? 'border-brand-500 text-brand-400 bg-card/60'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Inventory Sub-Ledger vs GL (#1300)</span>
        </button>
        <button
          onClick={() => setActiveTab('grni')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'grni'
              ? 'border-brand-500 text-brand-400 bg-card/60'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>GRNI Clearing Reconciliation ({grniReport.items.length})</span>
        </button>
      </div>

      {/* Tab 1: Inventory Sub-Ledger vs GL Account #1300 */}
      {activeTab === 'inventory_gl' && (
        <Card noPadding>
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
            <div>
              <h4 className="text-xs font-bold text-foreground">Item-by-Item Material Sub-Ledger Breakdown</h4>
              <p className="text-[11px] text-muted-foreground">
                Audits all double-entry debits and credits posted to GL Control Account #1300.
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              inventoryReconciliation.isReconciled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {inventoryReconciliation.isReconciled ? 'RECONCILED (0.00 VARIANCE)' : 'OUT OF BALANCE'}
            </span>
          </div>

          {inventoryReconciliation.entities.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-xs">
              No inventory sub-ledger transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-card/80 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3">SKU Identifier</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-right">Debit Total (Inward)</th>
                    <th className="p-3 text-right">Credit Total (COGS / Outward)</th>
                    <th className="p-3 text-right">Net Asset Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                  {inventoryReconciliation.entities.map((entity) => (
                    <tr key={entity.entityId} className="hover:bg-muted/30">
                      <td className="p-3 font-bold text-brand-400">{entity.entityId}</td>
                      <td className="p-3 font-sans text-foreground">{entity.entityName}</td>
                      <td className="p-3 text-right text-foreground">${parseFloat(entity.totalDebit).toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">${parseFloat(entity.totalCredit).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        ${parseFloat(entity.netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: GRNI Clearing Report */}
      {activeTab === 'grni' && (
        <Card noPadding>
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
            <div>
              <h4 className="text-xs font-bold text-foreground">Goods Received Not Invoiced (GRNI) Log</h4>
              <p className="text-[11px] text-muted-foreground">
                Tracks received inventory awaiting supplier invoice billing against GL Liability Account #2020.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Open GRNI Liability:</span>
              <span className="font-mono text-xs font-bold text-amber-400">
                ${parseFloat(grniReport.totalGRNIBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {tenant.baseCurrency}
              </span>
            </div>
          </div>

          {grniReport.items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-xs">
              No goods receipts recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-card/80 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3">GRN Receipt #</th>
                    <th className="p-3">Receipt Date</th>
                    <th className="p-3">PO Reference</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3 text-right">Received Amount</th>
                    <th className="p-3 text-right">Billed Amount</th>
                    <th className="p-3 text-right">Unbilled GRNI Balance</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                  {grniReport.items.map((it) => (
                    <tr key={it.goodsReceiptId} className="hover:bg-muted/30">
                      <td className="p-3 font-bold text-brand-400">{it.receiptNumber}</td>
                      <td className="p-3 text-muted-foreground">{it.receiptDate}</td>
                      <td className="p-3 text-foreground/90">{it.poNumber}</td>
                      <td className="p-3 font-sans text-foreground">{it.supplierName}</td>
                      <td className="p-3 text-right text-foreground">${parseFloat(it.receivedAmount).toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">${parseFloat(it.billedAmount).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-amber-400">
                        ${parseFloat(it.unbilledBalance).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          it.status === 'fully_billed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : it.status === 'partially_billed'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {it.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
