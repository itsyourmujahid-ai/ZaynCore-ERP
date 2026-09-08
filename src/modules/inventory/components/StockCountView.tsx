// ============================================================================
// Physical Stock Counts & Cycle Audits Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Play
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
import { DbStockCountItem } from '@/database/types';

export const StockCountView: React.FC<{
  onAdjustmentGenerated?: () => void;
}> = ({ onAdjustmentGenerated }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);

  const warehouses = db.getWarehouses(tenant);
  const items = db.getItems(tenant).filter((i) => i.trackInventory);

  // Create Form State
  const [countNumber, setCountNumber] = useState(`COUNT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Active Count Entry State
  const [countedQuantities, setCountedQuantities] = useState<Record<string, string>>({});

  const counts = db.getStockCounts(tenant);
  const activeCount = selectedCountId ? db.getStockCountById(selectedCountId, tenant) : null;

  const handleCreateSnapshotCount = (e: React.FormEvent) => {
    e.preventDefault();
    const countItems: DbStockCountItem[] = items.map((item, idx) => {
      const bal = inventoryService.getStockBalance(item.id, warehouseId, tenant);
      return {
        id: `sc-item-${idx + 1}`,
        itemId: item.id,
        systemQuantity: bal.quantity.toFixed(4),
        unitCost: item.currentAverageCost,
      };
    });

    const count = inventoryService.createStockCount({
      countNumber,
      warehouseId,
      countDate,
      status: 'in_progress',
      countedBy: tenant.userId,
      notes,
      items: countItems,
    }, tenant);

    setIsCreateModalOpen(false);
    setSelectedCountId(count.id);
    setCountNumber(`COUNT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleSaveCountEntry = (countId: string) => {
    const c = db.getStockCountById(countId, tenant);
    if (!c) return;

    const updatedItems = c.items.map((it) => {
      const counted = countedQuantities[it.itemId] !== undefined ? countedQuantities[it.itemId] : (it.countedQuantity || it.systemQuantity);
      const diff = parseFloat(counted) - parseFloat(it.systemQuantity);
      const varVal = diff * parseFloat(it.unitCost);
      return {
        ...it,
        countedQuantity: counted,
        varianceQuantity: diff.toFixed(4),
        varianceValue: varVal.toFixed(4),
      };
    });

    db.updateStockCount(countId, { items: updatedItems }, tenant);
    alert('Physical count entries saved successfully.');
  };

  const handleCompleteAndAdjust = (countId: string) => {
    try {
      handleSaveCountEntry(countId);
      const res = inventoryService.completeStockCountAndGenerateAdjustment(countId, tenant);
      alert(
        res.adjustment 
          ? `Stock count completed! Auto-generated & posted Adjustment ${res.adjustment.adjustmentNumber}` 
          : 'Stock count completed with zero variances.'
      );
      if (onAdjustmentGenerated) onAdjustmentGenerated();
    } catch (err: any) {
      alert(err.message || 'Failed to complete count.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search stock counts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Physical Count Snapshot
        </Button>
      </div>

      {/* Main Count Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Count Audits Register */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-slate-400">Stock Count Audits ({counts.length})</h4>
          {counts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
              No count snapshots created yet.
            </div>
          ) : (
            <div className="space-y-2">
              {counts.map((c) => {
                const wh = warehouses.find((w) => w.id === c.warehouseId);
                const isSelected = selectedCountId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCountId(c.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-brand-500 ring-1 ring-brand-500/30'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs text-brand-400">{c.countNumber}</span>
                        <h5 className="text-xs font-semibold text-slate-200 mt-0.5">{wh?.name || c.warehouseId}</h5>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                      <span>Date: {c.countDate}</span>
                      <span>{c.items.length} SKUs Audited</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Count Sheet & Variance Entry Table */}
        <div className="lg:col-span-2 space-y-3">
          {activeCount ? (
            <Card
              title={`${activeCount.countNumber} Physical Count Sheet`}
              subtitle={`Auditing warehouse ${warehouses.find((w) => w.id === activeCount.warehouseId)?.name}`}
              action={
                activeCount.status !== 'completed' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveCountEntry(activeCount.id)}
                    >
                      Save Entries
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleCompleteAndAdjust(activeCount.id)}
                    >
                      Complete & Adjust
                    </Button>
                  </div>
                ) : undefined
              }
            >
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-right">System Snapshot</th>
                      <th className="p-3 text-right w-32">Physical Counted</th>
                      <th className="p-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/20 font-mono">
                    {activeCount.items.map((it) => {
                      const itemObj = items.find((i) => i.id === it.itemId);
                      const currentVal = countedQuantities[it.itemId] !== undefined
                        ? countedQuantities[it.itemId]
                        : (it.countedQuantity || it.systemQuantity);
                      const diff = parseFloat(currentVal) - parseFloat(it.systemQuantity);

                      return (
                        <tr key={it.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-brand-400">{itemObj?.itemCode || it.itemId}</td>
                          <td className="p-3 font-sans text-slate-200">{itemObj?.name}</td>
                          <td className="p-3 text-right text-slate-400">{it.systemQuantity}</td>
                          <td className="p-3 text-right">
                            {activeCount.status === 'completed' ? (
                              <span className="font-bold text-slate-100">{it.countedQuantity}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={currentVal}
                                onChange={(e) => {
                                  setCountedQuantities({
                                    ...countedQuantities,
                                    [it.itemId]: e.target.value,
                                  });
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-slate-100 font-bold"
                              />
                            )}
                          </td>
                          <td className="p-3 text-right font-bold">
                            <span className={diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/20 rounded-xl border border-slate-800">
              Select a stock count audit to enter physical quantities or create a new snapshot.
            </div>
          )}
        </div>
      </div>

      {/* Create Count Snapshot Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initiate Physical Stock Count Snapshot"
        size="md"
      >
        <form onSubmit={handleCreateSnapshotCount} className="space-y-4">
          <Input
            label="Audit / Count Number *"
            value={countNumber}
            onChange={(e) => setCountNumber(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Warehouse Hub *"
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            />
            <Input
              label="Count Date *"
              type="date"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              required
            />
          </div>
          <Input
            label="Audit Notes / Scope"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Q1 Annual physical cycle audit"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
              icon={<Play className="w-4 h-4" />}
            >
              Freeze & Start Count
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
