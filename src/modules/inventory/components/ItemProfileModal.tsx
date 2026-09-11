// ============================================================================
// Item SKU 360-Degree Profile & Stock Valuation Modal Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Boxes, 
  Layers, 
  Building2, 
  History, 
  Barcode, 
  DollarSign, 
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';

export const ItemProfileModal: React.FC<{
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ itemId, isOpen, onClose }) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'movements' | 'batches'>('overview');

  if (!isOpen || !itemId) return null;

  const item = db.getItemById(itemId, tenant);
  if (!item) return null;

  const summary = inventoryService.getItemStockSummary(item.id, tenant);
  const movements = db.getStockMovements(tenant).filter((m) => m.itemId === item.id);
  const batches = db.getBatchLots(item.id, tenant);
  const serials = db.getSerialNumbers(item.id, tenant);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${item.name} (${item.itemCode})`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total On-Hand"
            value={`${summary.totalQuantity} ${summary.uomSymbol}`}
            icon={<Boxes className="w-4 h-4 text-brand-400" />}
            subtext={`Status: ${summary.isLowStock ? 'Low Stock Alert' : 'Healthy Level'}`}
          />
          <MetricCard
            label="Average Unit Cost"
            value={`$${summary.averageUnitCost} ${tenant.baseCurrency}`}
            icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
            subtext="Perpetual Weighted Average"
          />
          <MetricCard
            label="Total Stock Valuation"
            value={`$${summary.totalValuation} ${tenant.baseCurrency}`}
            icon={<Layers className="w-4 h-4 text-amber-400" />}
            subtext="GL Control Account #1300"
          />
          <MetricCard
            label="Reorder Threshold"
            value={`${summary.reorderLevel} ${summary.uomSymbol}`}
            icon={<AlertTriangle className="w-4 h-4 text-purple-400" />}
            subtext={`Min: ${summary.minStockLevel} | Max: ${summary.maxStockLevel}`}
          />
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-400 bg-card/60'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Specifications & Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'warehouses'
                ? 'border-brand-500 text-brand-400 bg-card/60'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Warehouse Stocks ({summary.warehouseBreakdown.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'movements'
                ? 'border-brand-500 text-brand-400 bg-card/60'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Ledger ({movements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'batches'
                ? 'border-brand-500 text-brand-400 bg-card/60'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Batches & Serials ({batches.length + serials.length})</span>
          </button>
        </div>

        {/* Tab 1: Specifications & GL Accounts */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-card/60 border border-border/80 space-y-3">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                Item Attributes & Classification
              </h4>
              <div className="grid grid-cols-2 gap-2 text-foreground/90">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Item Type</span>
                  <StatusBadge status={item.itemType} />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-medium text-foreground">{summary.categoryName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Unit of Measure</span>
                  <span className="font-medium text-foreground">{summary.uomSymbol}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Costing Method</span>
                  <span className="font-medium text-amber-400 uppercase">{item.costingMethod}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Barcode</span>
                  <span className="font-mono text-foreground/90">{item.barcode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Track Inventory</span>
                  <span className={`font-bold ${item.trackInventory ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {item.trackInventory ? 'YES (Perpetual)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/80 space-y-3">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Linked General Ledger Accounts
              </h4>
              <div className="space-y-2 text-foreground/90">
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-muted-foreground text-[11px]">Inventory Asset Account:</span>
                  <span className="font-mono font-semibold text-brand-400">{item.inventoryAccountId || '#1300 Merchandise Inventory Asset'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-muted-foreground text-[11px]">COGS / Sales Expense:</span>
                  <span className="font-mono font-semibold text-purple-400">{item.cogsAccountId || '#5010 Direct Material & COGS'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-900">
                  <span className="text-muted-foreground text-[11px]">Purchase Expense Account:</span>
                  <span className="font-mono font-semibold text-foreground/90">{item.purchaseExpenseAccountId || '#5010 Purchases/Direct Cost'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground text-[11px]">Sales Revenue Account:</span>
                  <span className="font-mono font-semibold text-emerald-400">{item.salesRevenueAccountId || '#4010 Product Sales Revenue'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Warehouse Stock Breakdown */}
        {activeTab === 'warehouses' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-card text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-3">Warehouse Code</th>
                    <th className="p-3">Warehouse Name</th>
                    <th className="p-3 text-right">On-Hand Quantity</th>
                    <th className="p-3 text-right">Valuation ({tenant.baseCurrency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card/40">
                  {summary.warehouseBreakdown.map((wh) => (
                    <tr key={wh.warehouseId} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-brand-400">{wh.warehouseCode}</td>
                      <td className="p-3 font-medium text-foreground">{wh.warehouseName}</td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground">
                        {wh.quantity} {summary.uomSymbol}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                        ${parseFloat(wh.valuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Stock Movement History */}
        {activeTab === 'movements' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {movements.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">No stock movements recorded yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-card text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Movement #</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Dir</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Total Cost</th>
                      <th className="p-2.5">Source Doc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 bg-card/40 font-mono text-[11px]">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="p-2.5 text-muted-foreground">{m.movementDate}</td>
                        <td className="p-2.5 font-bold text-foreground">{m.movementNumber}</td>
                        <td className="p-2.5 text-foreground/90 uppercase">{m.movementType.replace('_', ' ')}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {m.direction}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">{m.quantity}</td>
                        <td className="p-2.5 text-right text-muted-foreground">${parseFloat(m.unitCost).toFixed(2)}</td>
                        <td className="p-2.5 text-right text-emerald-400 font-bold">${parseFloat(m.totalCost).toFixed(2)}</td>
                        <td className="p-2.5 text-brand-400">{m.sourceDocumentNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Batches & Serials */}
        {activeTab === 'batches' && (
          <div className="space-y-4 text-xs">
            <div>
              <h5 className="font-bold text-foreground mb-2">Tracked Batches / Lots ({batches.length})</h5>
              {batches.length === 0 ? (
                <div className="p-4 rounded-lg bg-card border border-border text-muted-foreground">No active batches.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {batches.map((b) => (
                    <div key={b.id} className="p-3 rounded-lg bg-card border border-border flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-brand-400 block">{b.batchNumber}</span>
                        <span className="text-[10px] text-muted-foreground">Exp: {b.expiryDate || 'N/A'}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">{b.quantity} units</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h5 className="font-bold text-foreground mb-2">Serialized Units ({serials.length})</h5>
              {serials.length === 0 ? (
                <div className="p-4 rounded-lg bg-card border border-border text-muted-foreground">No registered serial numbers.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {serials.map((s) => (
                    <div key={s.id} className="p-2.5 rounded-lg bg-card border border-border flex justify-between items-center">
                      <span className="font-mono text-foreground/90">{s.serialNumber}</span>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
