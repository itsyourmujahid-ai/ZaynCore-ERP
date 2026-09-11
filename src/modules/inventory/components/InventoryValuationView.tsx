// ============================================================================
// Perpetual Inventory Valuation Schedule & Cost Layer Report Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Calculator, 
  Layers, 
  DollarSign 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryValuationService } from '@/modules/inventory/services/inventory-valuation.service';
import { Card } from '@/ui/components/Card';
import { MetricCard } from '@/ui/data-display/MetricCard';

export const InventoryValuationView: React.FC = () => {
  const { tenant } = useAuth();
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const warehouses = db.getWarehouses(tenant);
  const categories = db.getItemCategories(tenant);

  const report = inventoryValuationService.getValuationReport({
    warehouseId: warehouseFilter !== 'all' ? warehouseFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
  }, tenant);

  return (
    <div className="space-y-4">
      {/* KPI Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Total Inventory Value"
          value={`$${parseFloat(report.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tenant.baseCurrency}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          subtext="Perpetual Weighted Average Method"
        />
        <MetricCard
          label="Total Stock Units"
          value={`${parseFloat(report.totalQuantity).toLocaleString()} Units`}
          icon={<Layers className="w-4 h-4 text-brand-400" />}
          subtext="Across Active Warehouses"
        />
        <MetricCard
          label="Valuation As-Of Date"
          value={report.asOfDate}
          icon={<Calculator className="w-4 h-4 text-amber-400" />}
          subtext="Reconciles to GL Asset Account #1300"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Warehouses ({warehouses.length})</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          Reported SKU Lines: <span className="font-bold text-foreground">{report.rows.length}</span>
        </div>
      </div>

      {/* Valuation Schedule Table */}
      <Card noPadding>
        {report.rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No stock items found for valuation schedule.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  {warehouseFilter !== 'all' && <th className="p-3">Warehouse Hub</th>}
                  <th className="p-3 text-right">On-Hand Quantity</th>
                  <th className="p-3 text-right">Avg Unit Cost</th>
                  <th className="p-3 text-right">Total Asset Valuation</th>
                  <th className="p-3 text-right">Costing Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                {report.rows.map((row) => (
                  <tr key={`${row.itemId}-${row.warehouseId || 'all'}`} className="hover:bg-muted/30">
                    <td className="p-3 font-bold text-brand-400">{row.itemCode}</td>
                    <td className="p-3 font-sans text-foreground">{row.name}</td>
                    <td className="p-3 font-sans text-muted-foreground">{row.categoryName}</td>
                    {warehouseFilter !== 'all' && (
                      <td className="p-3 font-sans text-foreground/90">{row.warehouseName || row.warehouseCode}</td>
                    )}
                    <td className="p-3 text-right font-bold text-foreground">
                      {row.quantity} {row.uomSymbol}
                    </td>
                    <td className="p-3 text-right text-foreground/90">
                      ${parseFloat(row.averageUnitCost).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      ${parseFloat(row.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-amber-400 uppercase text-[10px]">
                      {row.costingMethod}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-card text-xs font-bold text-foreground border-t-2 border-border">
                <tr>
                  <td colSpan={warehouseFilter !== 'all' ? 4 : 3} className="p-3 text-muted-foreground font-sans">
                    TOTAL PERPETUAL INVENTORY ASSET VALUATION
                  </td>
                  <td className="p-3 text-right font-mono text-foreground">
                    {parseFloat(report.totalQuantity).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-muted-foreground">-</td>
                  <td className="p-3 text-right font-mono text-emerald-400 text-sm">
                    ${parseFloat(report.totalValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
