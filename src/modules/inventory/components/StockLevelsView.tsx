// ============================================================================
// Multi-Warehouse Stock Levels & Reorder Schedule Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Search, 
  AlertTriangle, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { ItemProfileModal } from './ItemProfileModal';

export const StockLevelsView: React.FC<{
  onNavigateToTransfers?: () => void;
}> = ({ onNavigateToTransfers }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const items = db.getItems(tenant).filter((i) => i.trackInventory);
  const warehouses = db.getWarehouses(tenant);
  const uoms = db.getUnitsOfMeasure(tenant);

  const stockRows = items.map((item) => {
    const summary = inventoryService.getItemStockSummary(item.id, tenant);
    const uom = uoms.find((u) => u.id === item.uomId);
    return {
      item,
      summary,
      uomSymbol: uom?.symbol || 'pcs',
    };
  });

  const filteredRows = stockRows.filter(({ item, summary }) => {
    const matchesSearch = 
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !showLowStockOnly || summary.isLowStock;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search stock by SKU, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Warehouses ({warehouses.length})</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>

          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showLowStockOnly
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Reorders Only</span>
          </button>
        </div>

        {onNavigateToTransfers && (
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={onNavigateToTransfers}
          >
            Transfer Stock
          </Button>
        )}
      </div>

      {/* Stock Matrix Table */}
      <Card noPadding>
        {filteredRows.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No stock levels match current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-right">Total On-Hand</th>
                  <th className="p-3 text-right">Reorder Level</th>
                  <th className="p-3 text-right">Weighted Avg Cost</th>
                  <th className="p-3 text-right">Total Valuation</th>
                  <th className="p-3">Warehouse Breakdown</th>
                  <th className="p-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                {filteredRows.map(({ item, summary, uomSymbol }) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold text-brand-400">{item.itemCode}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{summary.categoryName}</div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={summary.isLowStock ? 'text-amber-400' : 'text-slate-100'}>
                        {summary.totalQuantity} {uomSymbol}
                      </span>
                      {summary.isLowStock && (
                        <span className="block text-[10px] text-amber-400 font-semibold uppercase">Reorder Needed</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">
                      {summary.reorderLevel} {uomSymbol}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200">
                      ${summary.averageUnitCost}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      ${parseFloat(summary.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {summary.warehouseBreakdown.map((wh) => (
                          <span
                            key={wh.warehouseId}
                            className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                          >
                            <span className="text-slate-500">{wh.warehouseCode}:</span> {wh.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ItemProfileModal
        itemId={selectedItemId}
        isOpen={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
};
