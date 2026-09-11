// ============================================================================
// Stock Adjustments & Controlled Inventory Write-Offs Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Scale, 
  Trash2,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { StockAdjustmentReason, DbStockAdjustmentItem } from '@/database/types';

export const StockAdjustmentsView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const warehouses = db.getWarehouses(tenant);
  const items = db.getItems(tenant).filter((i) => i.trackInventory);

  // Form State
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [reason, setReason] = useState<StockAdjustmentReason>('counting_difference');
  const [adjustmentNumber, setAdjustmentNumber] = useState(`ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [adjustmentItems, setAdjustmentItems] = useState<DbStockAdjustmentItem[]>([
    {
      id: 'adj-item-1',
      itemId: items[0]?.id || '',
      warehouseId: warehouses[0]?.id || '',
      systemQuantity: '10.0000',
      countedQuantity: '12.0000',
      differenceQuantity: '2.0000',
      unitCost: '50.0000',
      totalVarianceCost: '100.0000',
    },
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  const adjustments = db.getStockAdjustments(tenant);

  const filteredAdjustments = adjustments.filter((a) =>
    a.adjustmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItemRow = () => {
    const firstItem = items[0];
    const unitCost = firstItem ? firstItem.currentAverageCost : '0.0000';
    setAdjustmentItems([
      ...adjustmentItems,
      {
        id: `adj-item-${Date.now()}`,
        itemId: firstItem?.id || '',
        warehouseId: warehouseId || warehouses[0]?.id || '',
        systemQuantity: '0.0000',
        countedQuantity: '0.0000',
        differenceQuantity: '0.0000',
        unitCost,
        totalVarianceCost: '0.0000',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (adjustmentItems.length <= 1) return;
    setAdjustmentItems(adjustmentItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...adjustmentItems];
    const row = { ...updated[index] };

    if (field === 'itemId') {
      row.itemId = value;
      const it = db.getItemById(value, tenant);
      if (it) {
        row.unitCost = it.currentAverageCost;
        const bal = inventoryService.getStockBalance(it.id, warehouseId, tenant);
        row.systemQuantity = bal.quantity.toFixed(4);
        const counted = parseFloat(row.countedQuantity || '0');
        const diff = counted - bal.quantity;
        row.differenceQuantity = diff.toFixed(4);
        row.totalVarianceCost = (diff * parseFloat(it.currentAverageCost)).toFixed(4);
      }
    } else if (field === 'countedQuantity') {
      row.countedQuantity = value;
      const counted = parseFloat(value || '0');
      const sys = parseFloat(row.systemQuantity || '0');
      const diff = counted - sys;
      row.differenceQuantity = diff.toFixed(4);
      row.totalVarianceCost = (diff * parseFloat(row.unitCost || '0')).toFixed(4);
    } else if (field === 'systemQuantity') {
      row.systemQuantity = value;
      const sys = parseFloat(value || '0');
      const counted = parseFloat(row.countedQuantity || '0');
      const diff = counted - sys;
      row.differenceQuantity = diff.toFixed(4);
      row.totalVarianceCost = (diff * parseFloat(row.unitCost || '0')).toFixed(4);
    }

    updated[index] = row;
    setAdjustmentItems(updated);
  };

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      inventoryService.createStockAdjustment({
        adjustmentNumber,
        adjustmentDate,
        warehouseId,
        reason,
        status: 'draft',
        requestedBy: tenant.userId,
        notes,
        items: adjustmentItems,
      }, tenant);

      setIsCreateModalOpen(false);
      setAdjustmentNumber(`ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create adjustment.');
    }
  };

  const handleApproveAndPost = (adjustmentId: string) => {
    try {
      inventoryService.approveAndPostStockAdjustment(adjustmentId, tenant);
    } catch (err: any) {
      alert(err.message || 'Failed to approve adjustment.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search adjustments by # or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg('');
            setIsCreateModalOpen(true);
          }}
        >
          New Stock Adjustment
        </Button>
      </div>

      {/* Adjustments Table */}
      <Card noPadding>
        {filteredAdjustments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground/90">No Stock Adjustments Recorded</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Record controlled quantity variances for shrinkage, found stock, damage, or cycle counts with automatic GL variance postings.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Adjustment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Adjustment #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Warehouse Hub</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 text-right">Net Variance Value</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20">
                {filteredAdjustments.map((a) => {
                  const wh = warehouses.find((w) => w.id === a.warehouseId);
                  const netVal = a.items.reduce((sum, it) => sum + parseFloat(it.totalVarianceCost || '0'), 0);

                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold text-brand-400">{a.adjustmentNumber}</td>
                      <td className="p-3 text-foreground/90">{a.adjustmentDate}</td>
                      <td className="p-3 font-medium text-foreground">{wh?.name || a.warehouseId}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground/90 uppercase font-semibold text-[10px]">
                          {a.reason.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {netVal >= 0 ? `+$${netVal.toFixed(2)}` : `-$${Math.abs(netVal).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="p-3 text-right">
                        {a.status !== 'posted' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />}
                            onClick={() => handleApproveAndPost(a.id)}
                          >
                            Approve & Post GL
                          </Button>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            JV Posted ({a.journalEntryId || 'Locked'})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Stock Adjustment / Write-Off"
        size="lg"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Adjustment Number *"
              value={adjustmentNumber}
              onChange={(e) => setAdjustmentNumber(e.target.value)}
              required
            />
            <Input
              label="Adjustment Date *"
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              required
            />
            <Select
              label="Target Warehouse *"
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            />
            <Select
              label="Adjustment Reason *"
              options={[
                { value: 'counting_difference', label: 'Physical Count Difference' },
                { value: 'damage', label: 'Damaged / Spoiled Stock' },
                { value: 'loss', label: 'Shrinkage / Unaccounted Loss' },
                { value: 'found_stock', label: 'Found Unrecorded Stock' },
                { value: 'expiry', label: 'Expired Inventory' },
                { value: 'administrative', label: 'Administrative Reclassification' },
              ]}
              value={reason}
              onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
            />
          </div>

          {/* Lines Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground/90">Adjustment Items</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddItemRow}
              >
                Add SKU Line
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-card text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Item SKU</th>
                    <th className="p-2.5 text-right w-24">System Qty</th>
                    <th className="p-2.5 text-right w-24">Counted Qty</th>
                    <th className="p-2.5 text-right w-24">Variance Qty</th>
                    <th className="p-2.5 text-right w-28">Variance Value</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card/30 font-mono">
                  {adjustmentItems.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="p-2 font-sans">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                          className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-foreground"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.itemCode} - {i.name} (${i.currentAverageCost})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.systemQuantity}
                          onChange={(e) => handleItemChange(idx, 'systemQuantity', e.target.value)}
                          className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-right text-muted-foreground"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={row.countedQuantity}
                          onChange={(e) => handleItemChange(idx, 'countedQuantity', e.target.value)}
                          className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-right text-foreground font-bold"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <span className={parseFloat(row.differenceQuantity) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {parseFloat(row.differenceQuantity) >= 0 ? `+${row.differenceQuantity}` : row.differenceQuantity}
                        </span>
                      </td>
                      <td className="p-2 text-right font-bold">
                        <span className={parseFloat(row.totalVarianceCost) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ${parseFloat(row.totalVarianceCost).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-muted-foreground hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Input
            label="Internal Notes / Audit Justification"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Discovered during monthly cycle count audit"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Scale className="w-4 h-4" />}
            >
              Create Draft Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
