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
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by movement #, SKU, source document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
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

        <div className="text-xs text-slate-400 font-mono">
          Total Logged Entries: <span className="font-bold text-slate-200">{movements.length}</span>
        </div>
      </div>

      {/* Material Ledger Table */}
      <Card noPadding>
        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No stock movement transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/20 font-mono text-[11px]">
                {filteredMovements.map((m) => {
                  const item = items.find((i) => i.id === m.itemId);
                  const wh = warehouses.find((w) => w.id === m.warehouseId);

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400">{m.movementDate}</td>
                      <td className="p-3 font-bold text-slate-200">{m.movementNumber}</td>
                      <td className="p-3">
                        <span className="font-bold text-brand-400">{item?.itemCode || m.itemId}</span>
                        <div className="font-sans text-[10px] text-slate-400 truncate max-w-[150px]">{item?.name}</div>
                      </td>
                      <td className="p-3 font-sans text-slate-300">{wh?.code || m.warehouseId}</td>
                      <td className="p-3 uppercase text-[10px] text-slate-300">
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
                      <td className="p-3 text-right font-bold text-slate-100">{m.quantity}</td>
                      <td className="p-3 text-right text-slate-300">${parseFloat(m.unitCost).toFixed(2)}</td>
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
