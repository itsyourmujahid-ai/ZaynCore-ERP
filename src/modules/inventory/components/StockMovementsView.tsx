// ============================================================================
// Immutable Stock Ledger & Material Movement History Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';

export const StockMovementsView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const movements = db.getStockMovements(tenant).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items = db.getItems(tenant);
  const warehouses = db.getWarehouses(tenant);

  const filteredMovements = movements.filter((m) => {
    const item = items.find((i) => i.id === m.itemId);
    const matchesSearch = 
      m.movementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sourceDocumentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item && (item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) || item.name.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesType = typeFilter === 'all' || m.movementType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Search & Type Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by movement #, SKU, source document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Movement Types</option>
            <option value="purchase_receipt">Purchase Receipt (IN)</option>
            <option value="sales_delivery">Sales Delivery (OUT)</option>
            <option value="stock_transfer_out">Stock Transfer (OUT)</option>
            <option value="stock_transfer_in">Stock Transfer (IN)</option>
            <option value="stock_adjustment">Stock Adjustment</option>
            <option value="supplier_return">Supplier Return (OUT)</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          Total Logged Entries: <span className="font-bold text-foreground">{movements.length}</span>
        </div>
      </div>

      {/* Material Ledger Table */}
      <Card noPadding>
        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No stock movement transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Movement #</th>
                  <th className="p-3">Item SKU</th>
                  <th className="p-3">Warehouse Hub</th>
                  <th className="p-3">Movement Event</th>
                  <th className="p-3 text-center">Dir</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Total Valuation</th>
                  <th className="p-3">Source Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20 font-mono text-[11px]">
                {filteredMovements.map((m) => {
                  const item = items.find((i) => i.id === m.itemId);
                  const wh = warehouses.find((w) => w.id === m.warehouseId);

                  return (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{m.movementDate}</td>
                      <td className="p-3 font-bold text-foreground">{m.movementNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-brand-400">{item?.itemCode || m.itemId}</span>
                        <div className="font-sans text-[10px] text-muted-foreground truncate max-w-[150px]">{item?.name}</div>
                      </td>
                      <td className="p-3 font-sans text-foreground/90">{wh?.code || m.warehouseId}</td>
                      <td className="p-3 uppercase text-[10px] text-foreground/90">
                        {m.movementType.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          m.direction === 'IN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {m.direction === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {m.direction}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-foreground">{m.quantity}</td>
                      <td className="p-3 text-right text-foreground/90">${parseFloat(m.unitCost).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        ${parseFloat(m.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-brand-400">{m.sourceDocumentNumber}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
