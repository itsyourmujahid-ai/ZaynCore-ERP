// ============================================================================
// Master Inventory & Warehouse Management Workspace (Phase 7 Architecture)
// ============================================================================

import React, { useState } from 'react';
import { 
  Boxes, 
  Layers, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  TrendingUp, 
  Building2,
  Calendar,
  History,
  Calculator,
  Scale,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { subLedgerService } from '@/modules/accounting/services/sub-ledger.service';
import { inventoryValuationService } from '@/modules/inventory/services/inventory-valuation.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';

// Views
import { ItemDirectoryView } from './ItemDirectoryView';
import { StockLevelsView } from './StockLevelsView';
import { WarehousesView } from './WarehousesView';
import { StockTransfersView } from './StockTransfersView';
import { StockAdjustmentsView } from './StockAdjustmentsView';
import { StockCountView } from './StockCountView';
import { StockMovementsView } from './StockMovementsView';
import { InventoryValuationView } from './InventoryValuationView';
import { InventoryReconciliationView } from './InventoryReconciliationView';

export const InventoryWorkspace: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const items = db.getItems(tenant);
  const warehouses = db.getWarehouses(tenant);
  const movements = db.getStockMovements(tenant);

  // Compute Live Metrics
  const valuationReport = inventoryValuationService.getValuationReport(undefined, tenant);
  const invReconciliation = subLedgerService.reconcileSubLedger('inventory_item', tenant);
  const grniReport = inventoryValuationService.getGRNIReconciliation(tenant);

  let lowStockCount = 0;
  for (const it of items) {
    if (!it.trackInventory) continue;
    const bal = inventoryService.getStockBalance(it.id, undefined, tenant);
    if (bal.quantity <= parseFloat(it.reorderLevel || '0')) {
      lowStockCount++;
    }
  }

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'items', label: 'Items', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'stock', label: 'Stock Levels', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'warehouses', label: 'Warehouses', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'transfers', label: 'Transfers', icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { id: 'adjustments', label: 'Adjustments', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'stock_count', label: 'Stock Count', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  const moreMenuItems = [
    {
      label: 'Stock Movements & Ledger',
      icon: <History className="w-3.5 h-3.5 text-cyan-400" />,
      onClick: () => setActiveTab('movements'),
    },
    {
      label: 'Perpetual Valuation Schedule',
      icon: <Calculator className="w-3.5 h-3.5 text-emerald-400" />,
      onClick: () => setActiveTab('valuation'),
    },
    {
      label: 'Inventory / GL & GRNI Reconciliation',
      icon: <Scale className="w-3.5 h-3.5 text-amber-400" />,
      onClick: () => setActiveTab('reconciliation'),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Supply Chain & Inventory', onClick: () => setActiveTab('overview') },
          { label: primaryTabs.find((t) => t.id === activeTab)?.label || activeTab.toUpperCase(), isCurrent: true },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Inventory & Warehousing</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Perpetual weighted-average valuation, multi-warehouse stock ledger, GRNI clearing, and COGS accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTab('items')}
          >
            Register SKU
          </Button>

          <DropdownMenu
            label="More Reports ▾"
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
                onClick={() => setActiveTab(tab.id)}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Perpetual Inventory Asset"
              value={`$${parseFloat(valuationReport.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tenant.baseCurrency}`}
              icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
              subtext="GL Account #1300 Asset"
            />
            <MetricCard
              label="Total Tracked SKUs"
              value={`${items.length} Items`}
              icon={<Layers className="w-5 h-5 text-brand-400" />}
              subtext={`${warehouses.length} Active Hubs / Depots`}
            />
            <MetricCard
              label="Low Stock Reorder Alerts"
              value={`${lowStockCount} SKUs`}
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              subtext={lowStockCount > 0 ? 'Below Reorder Threshold' : 'Stock Levels Optimal'}
            />
            <MetricCard
              label="GL Sub-Ledger Sync"
              value={invReconciliation.isReconciled ? 'Reconciled' : 'Variance'}
              icon={invReconciliation.isReconciled ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
              subtext={`Variance: $${parseFloat(invReconciliation.variance).toFixed(4)}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Quick Actions & Recent Inventory Movements */}
            <Card
              title="Recent Stock Ledger Movements"
              subtitle="Live chronological material transactions"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('movements')}
                >
                  View All ({movements.length})
                </Button>
              }
            >
              {movements.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">No stock movements logged.</div>
              ) : (
                <div className="space-y-2">
                  {movements.slice(0, 5).map((m) => {
                    const item = items.find((i) => i.id === m.itemId);
                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg bg-card/60 border border-border/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {m.direction}
                          </span>
                          <div>
                            <div className="font-semibold text-foreground">{item?.name || m.itemId}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{m.movementNumber} • {m.movementType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-foreground">{m.quantity} units</div>
                          <div className="text-[10px] font-mono text-emerald-400 font-semibold">${parseFloat(m.totalCost).toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* GRNI Clearing & Workflow Sync Status */}
            <Card
              title="Perpetual Accounting Engine Rules"
              subtitle="Centralized double-entry automated posting events"
            >
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-card/80 border border-border">
                  <div className="font-bold text-foreground flex items-center justify-between">
                    <span>Goods Receipt (Inward Stock):</span>
                    <span className="text-brand-400 font-mono">INVENTORY_RECEIPT_POSTED</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-1 font-mono">
                    Dr Merchandise Inventory Asset (#1300) <br />
                    Cr Goods Received Not Invoiced GRNI (#2020)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card/80 border border-border">
                  <div className="font-bold text-foreground flex items-center justify-between">
                    <span>Sales Delivery (Outward Stock & COGS):</span>
                    <span className="text-purple-400 font-mono">SALES_DELIVERY_POSTED</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-1 font-mono">
                    Dr Cost of Goods Sold (#5010) <br />
                    Cr Merchandise Inventory Asset (#1300)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card/80 border border-border">
                  <div className="font-bold text-foreground flex items-center justify-between">
                    <span>Open GRNI Clearing Liability:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      ${parseFloat(grniReport.totalGRNIBalance).toFixed(2)} {tenant.baseCurrency}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Receipts pending supplier invoice billing against Liability Account #2020.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && <ItemDirectoryView />}

      {/* Stock Levels Tab */}
      {activeTab === 'stock' && (
        <StockLevelsView onNavigateToTransfers={() => setActiveTab('transfers')} />
      )}

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && <WarehousesView />}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && <StockTransfersView />}

      {/* Adjustments Tab */}
      {activeTab === 'adjustments' && <StockAdjustmentsView />}

      {/* Stock Count Tab */}
      {activeTab === 'stock_count' && (
        <StockCountView onAdjustmentGenerated={() => setActiveTab('adjustments')} />
      )}

      {/* Movements Tab (More) */}
      {activeTab === 'movements' && <StockMovementsView />}

      {/* Valuation Tab (More) */}
      {activeTab === 'valuation' && <InventoryValuationView />}

      {/* Reconciliation Tab (More) */}
      {activeTab === 'reconciliation' && <InventoryReconciliationView />}
    </div>
  );
};
