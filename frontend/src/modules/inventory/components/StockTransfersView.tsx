// ============================================================================
// Inter-Warehouse Stock Transfers Component
// ============================================================================

import React, { useState } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  CheckCircle2, 
  Trash2
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
import { DbStockTransferItem } from '@/database/types';

export const StockTransfersView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const warehouses = db.getWarehouses(tenant);
  const items = db.getItems(tenant).filter((i) => i.trackInventory);

  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id || '');
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [transferNumber, setTransferNumber] = useState(`TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<DbStockTransferItem[]>([
    { id: 't-item-1', itemId: items[0]?.id || '', quantity: '5.0000', unitCost: '50.0000', totalCost: '250.0000' },
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  const transfers = db.getStockTransfers(tenant);

  const filteredTransfers = transfers.filter((t) =>
    t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItemRow = () => {
    setTransferItems([
      ...transferItems,
      {
        id: `t-item-${Date.now()}`,
        itemId: items[0]?.id || '',
        quantity: '1.0000',
        unitCost: '0.0000',
        totalCost: '0.0000',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DbStockTransferItem, value: string) => {
    const updated = [...transferItems];
    const row = { ...updated[index], [field]: value };

    if (field === 'itemId') {
      const it = db.getItemById(value, tenant);
      if (it) {
        row.unitCost = it.currentAverageCost;
        row.totalCost = (parseFloat(row.quantity || '1') * parseFloat(it.currentAverageCost)).toFixed(4);
      }
    } else if (field === 'quantity') {
      const q = parseFloat(value || '0');
      const c = parseFloat(row.unitCost || '0');
      row.totalCost = (q * c).toFixed(4);
    }

    updated[index] = row;
    setTransferItems(updated);
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (fromWarehouseId === toWarehouseId) {
      setErrorMsg('Source and Destination warehouses cannot be identical.');
      return;
    }

    try {
      inventoryService.createStockTransfer({
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        transferDate,
        status: 'draft',
        requestedBy: tenant.userId,
        notes,
        items: transferItems,
      }, tenant);

      setIsCreateModalOpen(false);
      setTransferNumber(`TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create stock transfer.');
    }
  };

  const handleExecuteTransfer = (transferId: string) => {
    try {
      inventoryService.executeStockTransfer(transferId, tenant);
    } catch (err: any) {
      alert(err.message || 'Failed to execute transfer.');
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
            placeholder="Search transfers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
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
          New Stock Transfer
        </Button>
      </div>

      {/* Transfers Register Table */}
      <Card noPadding>
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No Stock Transfers Recorded</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Initiate inter-warehouse inventory movements between central hubs and distribution staging centers.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Initiate Transfer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Transfer #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Origin Hub</th>
                  <th className="p-3">Destination Hub</th>
                  <th className="p-3">Line Items</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                {filteredTransfers.map((t) => {
                  const fromWh = warehouses.find((w) => w.id === t.fromWarehouseId);
                  const toWh = warehouses.find((w) => w.id === t.toWarehouseId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-brand-400">{t.transferNumber}</td>
                      <td className="p-3 text-slate-300">{t.transferDate}</td>
                      <td className="p-3 font-medium text-slate-200">{fromWh?.name || t.fromWarehouseId}</td>
                      <td className="p-3 font-medium text-slate-200">{toWh?.name || t.toWarehouseId}</td>
                      <td className="p-3 font-mono text-slate-400">{t.items.length} SKUs</td>
                      <td className="p-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="p-3 text-right">
                        {t.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            onClick={() => handleExecuteTransfer(t.id)}
                          >
                            Dispatch & Complete
                          </Button>
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

      {/* Create Stock Transfer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initiate Inter-Warehouse Stock Transfer"
        size="lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Transfer Number *"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              required
            />
            <Input
              label="Transfer Date *"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              required
            />
            <Select
              label="Origin Warehouse (Source) *"
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
            />
            <Select
              label="Destination Warehouse *"
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Transfer Line Items</span>
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

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Item SKU</th>
                    <th className="p-2.5 text-right w-28">Quantity</th>
                    <th className="p-2.5 text-right w-28">Avg Unit Cost</th>
                    <th className="p-2.5 text-right w-32">Total Value</th>
                    <th className="p-2.5 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                  {transferItems.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="p-2">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.itemCode} - {i.name} (On-Hand: {i.totalStockQuantity})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-right font-mono text-slate-100"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-slate-300">
                        ${parseFloat(row.unitCost).toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-400 font-bold">
                        ${parseFloat(row.totalCost).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
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
            label="Internal Notes / Transportation Logistics"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Dispatched via Logistics Fleet Truck #90"
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
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Create Transfer Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
